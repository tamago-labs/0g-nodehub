// lambda/deployment.js
const { ECSClient, RegisterTaskDefinitionCommand, CreateServiceCommand } = require("@aws-sdk/client-ecs");
const { EC2Client, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand } = require("@aws-sdk/client-ec2");
const { ElasticLoadBalancingV2Client, CreateTargetGroupCommand, CreateRuleCommand } = require("@aws-sdk/client-elastic-load-balancing-v2");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { Route53Client, ChangeResourceRecordSetsCommand } = require("@aws-sdk/client-route-53");
const { marshall } = require("@aws-sdk/util-dynamodb");

const ecsClient = new ECSClient({});
const ec2Client = new EC2Client({});
const elbClient = new ElasticLoadBalancingV2Client({});
const dynamoClient = new DynamoDBClient({});
const route53Client = new Route53Client({});

exports.handler = async (event) => {
  console.log('Deployment request:', JSON.stringify(event, null, 2));

  try {
    const {
      walletAddress,
      modelService,
      modelIdentifier,
      walletPrivateKey,
      domain,
      verificationMethod = 'TeeML'
    } = JSON.parse(event.body);

    // Basic validation
    if (!walletAddress || !modelService || !modelIdentifier || !walletPrivateKey) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: walletAddress, modelService, modelIdentifier, walletPrivateKey'
        })
      };
    }

    // Validate wallet address format (basic check)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: false,
          error: 'Invalid wallet address format'
        })
      };
    }

    const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate unique subdomain: [deployment-id].deploy.0gnodehub.com
    const subdomain = `${deploymentId}.${process.env.DEPLOYMENT_DOMAIN}`;
    const customDomain = domain || subdomain;
    const containerPort = 8080;

    // Create DynamoDB record
    const deploymentRecord = {
      walletAddress,
      deploymentId,
      status: 'DEPLOYING',
      modelService,
      modelIdentifier,
      verificationMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subdomain: customDomain,
      publicEndpoint: `https://${customDomain}`,
    };

    // Only add domain if it's provided
    if (domain) {
      deploymentRecord.domain = domain;
    }

    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Item: marshall(deploymentRecord, {
        removeUndefinedValues: true
      })
    }));

    try {
      // Create Security Group for the service
      const securityGroupResponse = await ec2Client.send(new CreateSecurityGroupCommand({
        GroupName: `0g-inference-${deploymentId}`,
        Description: `Security group for 0G inference provider ${deploymentId}`,
        VpcId: process.env.VPC_ID
      }));

      const securityGroupId = securityGroupResponse.GroupId;

      // Allow HTTP traffic
      await ec2Client.send(new AuthorizeSecurityGroupIngressCommand({
        GroupId: securityGroupId,
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: containerPort,
            ToPort: containerPort,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          },
          {
            IpProtocol: 'tcp',
            FromPort: 8000,
            ToPort: 8000,
            IpRanges: [{ CidrIp: '10.0.0.0/8' }] // Only allow VPC traffic for model service
          }
        ]
      }));

      // Create ECS Task Definition
      const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
        family: `0g-inference-${deploymentId}`,
        networkMode: 'awsvpc',
        requiresCompatibilities: ['FARGATE'],
        cpu: '1024', // 1 vCPU
        memory: '2048', // 2 GB
        executionRoleArn: `arn:aws:iam::057386374967:role/ecsTaskExecutionRole`,
        taskRoleArn: `arn:aws:iam::057386374967:role/ecsTaskExecutionRole`,
        containerDefinitions: [
          // {
          //   name: 'ai-model-service',
          //   image: modelService,
          //   cpu: 512,
          //   memory: 1024,
          //   essential: true,
          //   portMappings: [{
          //     containerPort: 8000,
          //     protocol: 'tcp'
          //   }],
          //   environment: [
          //     {
          //       name: 'MODEL_NAME',
          //       value: modelIdentifier
          //     }
          //   ],
          //   logConfiguration: {
          //     logDriver: 'awslogs',
          //     options: {
          //       'awslogs-group': '/ecs/0g-inference',
          //       'awslogs-region': process.env.AWS_REGION,
          //       'awslogs-stream-prefix': deploymentId,
          //       'awslogs-create-group': 'true'
          //     }
          //   },
          //   healthCheck: {
          //     command: ['CMD-SHELL', 'curl -f http://localhost:8000/health || curl -f http://localhost:8000/v1/models || exit 1'],
          //     interval: 30,
          //     timeout: 5,
          //     retries: 3,
          //     startPeriod: 60
          //   }
          // },
          {
            name: '0g-inference-broker',
            image: process.env.BROKER_IMAGE_URI || `${process.env.ECR_REPOSITORY_URI}:latest`,
            cpu: 512,
            memory: 1024,
            essential: true,
            // dependsOn: [{
            //   containerName: 'ai-model-service',
            //   condition: 'HEALTHY'
            // }],
            portMappings: [{
              containerPort: containerPort,
              protocol: 'tcp'
            }],
            environment: [
              {
                name: 'SERVING_URL',
                value: `https://${customDomain}`
              },
              {
                name: 'TARGET_URL',
                value: 'http://localhost:8000'
              },
              {
                name: 'MODEL',
                value: modelIdentifier
              },
              {
                name: 'VERIFICATION_METHOD',
                value: verificationMethod
              },
              {
                name: 'PRIVATE_KEYS',
                value: walletPrivateKey // In production, use Secrets Manager
              }
            ],
            logConfiguration: {
              logDriver: 'awslogs',
              options: {
                'awslogs-group': '/ecs/0g-inference',
                'awslogs-region': process.env.AWS_REGION,
                'awslogs-stream-prefix': `${deploymentId}-broker`,
                'awslogs-create-group': 'true'
              }
            },
            healthCheck: {
              command: ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'],
              interval: 30,
              timeout: 5,
              retries: 3,
              startPeriod: 30
            }
          }
        ]
      }));

      // Create ECS Service with Fargate
      const serviceResponse = await ecsClient.send(new CreateServiceCommand({
        cluster: process.env.CLUSTER_NAME,
        serviceName: `0g-inference-${deploymentId}`,
        taskDefinition: taskDefinitionResponse.taskDefinition.taskDefinitionArn,
        desiredCount: 1,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: process.env.SUBNETS.split(','),
            securityGroups: [securityGroupId],
            assignPublicIp: 'ENABLED' // Required for public subnets without NAT
          }
        },
        deploymentConfiguration: {
          maximumPercent: 200,
          minimumHealthyPercent: 0
        },
        tags: [
          {
            key: 'WalletAddress',
            value: walletAddress
          },
          {
            key: 'DeploymentId',
            value: deploymentId
          }
        ]
      }));

      // Create ALB Target Group
      const targetGroupResponse = await elbClient.send(new CreateTargetGroupCommand({
        Name: `0g-${deploymentId.substr(-20)}`, // ALB target group names have length limits
        Protocol: 'HTTP',
        Port: containerPort,
        VpcId: process.env.VPC_ID,
        TargetType: 'ip', // Use 'ip' for Fargate
        HealthCheckPath: '/health',
        HealthCheckProtocol: 'HTTP',
        HealthCheckIntervalSeconds: 30,
        HealthCheckTimeoutSeconds: 5,
        HealthyThresholdCount: 2,
        UnhealthyThresholdCount: 3,
        Tags: [
          {
            Key: 'WalletAddress',
            Value: walletAddress
          },
          {
            Key: 'DeploymentId',
            Value: deploymentId
          }
        ]
      }));

      // Handle different possible response structures
      const targetGroupArn = targetGroupResponse.TargetGroups[0].TargetGroupArn

      console.log("targetGroupArn:", targetGroupArn)

      // Add listener rule for this deployment (use host-header instead of path-pattern)
      const priority = Math.floor(Math.random() * 50000) + 1;
      const ruleResponse = await elbClient.send(new CreateRuleCommand({
        ListenerArn: process.env.HTTPS_LISTENER_ARN,
        Priority: priority,
        Conditions: [
          {
            Field: 'host-header',
            Values: [customDomain]
          }
        ],
        Actions: [
          {
            Type: 'forward',
            TargetGroupArn: targetGroupArn,
          }
        ],
        Tags: [
          {
            Key: 'WalletAddress',
            Value: walletAddress
          },
          {
            Key: 'DeploymentId',
            Value: deploymentId
          }
        ]
      }));

      // Note: We don't need to create individual Route53 records because
      // we have a wildcard record (*.deploy.0gnodehub.com) pointing to the load balancer
      // The ALB will route based on the Host header in the listener rule above
      console.log(`Using wildcard DNS routing for ${customDomain}`);

      // // Create Route53 record for custom subdomain (if using auto-generated subdomain)
      // if (!domain && customDomain.includes(process.env.DEPLOYMENT_DOMAIN)) {
      //   try {
      //     await route53Client.send(new ChangeResourceRecordSetsCommand({
      //       HostedZoneId: process.env.HOSTED_ZONE_ID,
      //       ChangeBatch: {
      //         Changes: [
      //           {
      //             Action: 'CREATE',
      //             ResourceRecordSet: {
      //               Name: customDomain,
      //               Type: 'A',
      //               AliasTarget: {
      //                 DNSName: process.env.LOAD_BALANCER_DNS,
      //                 EvaluateTargetHealth: false,
      //                 HostedZoneId: await getLoadBalancerHostedZoneId()
      //               }
      //             }
      //           }
      //         ]
      //       }
      //     }));
      //     console.log(`Created Route53 record for ${customDomain}`);
      //   } catch (route53Error) {
      //     console.error('Route53 record creation failed:', route53Error);
      //     // Continue anyway since wildcard should work
      //   }
      // }

      // Update deployment status
      const updateRecord = {
        walletAddress,
        deploymentId,
        status: 'DEPLOYED',
        modelService,
        modelIdentifier,
        verificationMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetGroupArn,
        serviceArn: serviceResponse.service.serviceArn,
        ruleArn: ruleResponse.Rules[0].RuleArn,
        securityGroupId: securityGroupId,
        subdomain: customDomain,
        publicEndpoint: `https://${customDomain}`,
      };

      // Only add domain if it's provided
      if (domain) {
        updateRecord.domain = domain;
      }

      await dynamoClient.send(new PutItemCommand({
        TableName: process.env.DEPLOYMENTS_TABLE,
        Item: marshall(updateRecord, {
          removeUndefinedValues: true
        })
      }));

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: true,
          deploymentId,
          publicEndpoint: `https://${customDomain}`,
          subdomain: customDomain,
          status: 'DEPLOYED',
          message: 'Deployment initiated successfully. It may take a few minutes to become fully available.'
        })
      };

    } catch (deployError) {
      console.error('Deployment creation failed:', deployError);

      // Update status to failed
      await dynamoClient.send(new PutItemCommand({
        TableName: process.env.DEPLOYMENTS_TABLE,
        Item: marshall({
          walletAddress,
          deploymentId,
          status: 'FAILED',
          errorMessage: deployError.message,
          updatedAt: new Date().toISOString()
        }, {
          removeUndefinedValues: true
        })
      }));

      throw deployError;
    }

  } catch (error) {
    console.error('Handler error:', error);

    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
  };
}

// Helper function to get load balancer hosted zone ID
// async function getLoadBalancerHostedZoneId() {
//   // AWS Application Load Balancer hosted zone IDs by region
//   const hostedZoneIds = {
//     'us-east-1': 'Z35SXDOTRQ7X7K',
//     'us-east-2': 'Z3AADJGX6KTTL2',
//     'us-west-1': 'Z368ELLRRE2KJ0',
//     'us-west-2': 'Z1H1FL5HABSF5',
//     'eu-west-1': 'Z32O12XQLNTSW2',
//     'eu-central-1': 'Z3F0SRJ5LGBH90',
//     'ap-southeast-1': 'Z1LMS91P8CMLE5',
//     // Add more regions as needed
//   };

//   return hostedZoneIds[process.env.AWS_REGION] || 'Z1LMS91P8CMLE5'; // Default to ap-southeast-1
// }