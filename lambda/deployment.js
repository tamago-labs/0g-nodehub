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
      console.log('Security group created:', securityGroupId);

      // Allow HTTP traffic
      await ec2Client.send(new AuthorizeSecurityGroupIngressCommand({
        GroupId: securityGroupId,
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          },
          {
            IpProtocol: 'tcp',
            FromPort: 3080,
            ToPort: 3080,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          }
        ]
      }));
      console.log('Security group rules added successfully');

      const nginxConfig = `
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name _;
        
        location /health {
            return 200 '{"status":"healthy","service":"nginx-proxy","deployment":"${deploymentId}"}';
            add_header Content-Type application/json;
        }
        
        location /0g/status {
            return 200 '{"wallet":"${walletAddress}","model":"${modelIdentifier}","verification":"${verificationMethod}"}';
            add_header Content-Type application/json;
        }
        
        location / {
            return 200 '{"message":"0G Inference Provider","wallet":"${walletAddress}","model":"${modelIdentifier}","status":"running","deployment":"${deploymentId}"}';
            add_header Content-Type application/json;
        }
    }
}`;

      // Create ECS Task Definition with simplified approach
      const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
        family: `0g-inference-${deploymentId}`,
        networkMode: 'awsvpc',
        requiresCompatibilities: ['FARGATE'],
        cpu: '1024', // 1 vCPU
        memory: '2048', // 2 GB
        executionRoleArn: `arn:aws:iam::057386374967:role/ecsTaskExecutionRole`,
        taskRoleArn: `arn:aws:iam::057386374967:role/ecsTaskExecutionRole`,
        containerDefinitions: [
          
          {
            name: 'nginx-proxy',
            image: 'nginx:1.27.0',
            cpu: 512,
            memory: 1024,
            essential: true,
            portMappings: [{
              containerPort: 80,
              protocol: 'tcp'
            }],
            environment: [
              {
                name: 'WALLET_ADDRESS',
                value: walletAddress
              },
              {
                name: 'MODEL_IDENTIFIER',
                value: modelIdentifier
              },
              {
                name: 'VERIFICATION_METHOD',
                value: verificationMethod
              },
              {
                name: 'DEPLOYMENT_ID',
                value: deploymentId
              }
            ],
            entryPoint: ['/bin/sh'],
            command: [
              '-c',
              `echo "Starting nginx configuration..." && ` +
              `echo '${nginxConfig.replace(/'/g, "'\\''")}' > /etc/nginx/nginx.conf && ` +
              `echo "Testing nginx configuration..." && ` +
              `nginx -t && ` +
              `echo "Starting nginx..." && ` +
              `nginx -g "daemon off;"`
            ],
            logConfiguration: {
              logDriver: 'awslogs',
              options: {
                'awslogs-group': '/ecs/0g-inference',
                'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
                'awslogs-stream-prefix': `${deploymentId}-proxy`,
                'awslogs-create-group': 'true'
              }
            },
            healthCheck: {
              command: ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1'],
              interval: 30,
              timeout: 5,
              retries: 3,
              startPeriod: 60 // Give more time for container to start
            }
          },
          // 0G Serving Broker
          {
            name: '0g-serving-broker',
            image: 'ghcr.io/0glabs/0g-serving-broker:0.2.1',
            cpu: 512,
            memory: 1024,
            essential: false, // Allow task to continue if broker fails
            portMappings: [{
              containerPort: 3080,
              protocol: 'tcp'
            }],
            environment: [
              {
                name: 'PORT',
                value: '3080'
              },
              {
                name: 'WALLET_PRIVATE_KEY',
                value: walletPrivateKey
              },
              {
                name: 'MODEL_IDENTIFIER',
                value: modelIdentifier
              },
              {
                name: 'VERIFICATION_METHOD',
                value: verificationMethod
              },
              {
                name: 'SERVING_URL',
                value: `https://${customDomain}`
              }
            ],
            command: [
              "/bin/sh",
              "-c",
              `
# Create basic config file
cat > /tmp/config.yaml << 'EOF'
interval:
  autoSettleBufferTime: 60
  forceSettlementProcessor: 600
  settlementProcessor: 300
networks:
  ethereum0g:
    url: "https://evmrpc-testnet.0g.ai"
    chainID: 16601
    privateKeys:
      - ${walletPrivateKey}
    transactionLimit: 1000000
    gasEstimationBuffer: 10000
service:
  servingUrl: "https://${customDomain}"
  targetUrl: "http://localhost:8000"
  inputPrice: 1
  outputPrice: 1
  type: "chatbot"
  model: "${modelIdentifier}"
  verifiability: "${verificationMethod}"
database:
  enabled: false
settlement:
  enabled: false
  zkProver:
    enabled: false
EOF

# Start the broker with timeout
echo "Starting 0G inference broker..."
timeout 60 0g-inference-server --config /tmp/config.yaml || {
  echo "0G broker failed to start within timeout, running fallback server..."
  # Simple HTTP server as fallback
  python3 -c "
import http.server
import socketserver
import json
from datetime import datetime

class CustomHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response = {
            'status': 'fallback_mode',
            'wallet': '${walletAddress}',
            'model': '${modelIdentifier}',
            'deployment': '${deploymentId}',
            'timestamp': datetime.now().isoformat(),
            'message': '0G broker fallback service'
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        self.do_GET()

with socketserver.TCPServer(('0.0.0.0', 3080), CustomHandler) as httpd:
    print('Fallback server running on port 3080')
    httpd.serve_forever()
"
}
              `
            ],
            logConfiguration: {
              logDriver: 'awslogs',
              options: {
                'awslogs-group': '/ecs/0g-inference',
                'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
                'awslogs-stream-prefix': `${deploymentId}-broker`,
                'awslogs-create-group': 'true'
              }
            },
            healthCheck: {
              command: ['CMD-SHELL', 'curl -f http://localhost:3080/ || exit 1'],
              interval: 60,
              timeout: 10,
              retries: 3,
              startPeriod: 120 // Give more time for potential fallback
            }
          },
          
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
        Port: 80,
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

      const targetGroupArn = targetGroupResponse.TargetGroups[0].TargetGroupArn;
      console.log("targetGroupArn:", targetGroupArn);

      // Add listener rule for this deployment
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

      console.log(`Using wildcard DNS routing for ${customDomain}`);

      // Update deployment status
      const updateRecord = {
        walletAddress,
        deploymentId,
        status: 'DEPLOYED',
        modelService,
        modelIdentifier,
        verificationMethod,
        createdAt: deploymentRecord.createdAt,
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