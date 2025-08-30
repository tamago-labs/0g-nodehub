// lambda/deployment.js
const { ECSClient, RegisterTaskDefinitionCommand, CreateServiceCommand, DescribeTasksCommand } = require("@aws-sdk/client-ecs");
const { EC2Client, DescribeNetworkInterfacesCommand } = require("@aws-sdk/client-ec2");
const { ElasticLoadBalancingV2Client, CreateTargetGroupCommand, CreateRuleCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { marshall } = require("@aws-sdk/util-dynamodb");

const ecsClient = new ECSClient({});
const ec2Client = new EC2Client({});
const elbClient = new ElasticLoadBalancingV2Client({});
const dynamoClient = new DynamoDBClient({});
const s3Client = new S3Client({});

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

    if (!walletAddress || !modelService || !modelIdentifier || !walletPrivateKey) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({ success: false, error: 'Missing required fields' })
      };
    }

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({ success: false, error: 'Invalid wallet address format' })
      };
    }

    const deploymentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 1. Create deployment-specific config files
    await createConfigFiles(deploymentId, {
      walletAddress,
      modelService, 
      modelIdentifier
    });

    // 2. Create Multi-Container Task Definition
    const taskDefinitionArn = await createMultiContainerTaskDefinition(deploymentId);

    // 2. Create ALB Target Group 
    const tgResp = await elbClient.send(new CreateTargetGroupCommand({
      Name: `tg-${deploymentId.slice(-8)}`,
      Port: 80,
      Protocol: 'HTTP',
      VpcId: process.env.VPC_ID,
      TargetType: 'ip',
      HealthCheckProtocol: 'HTTP',
      HealthCheckPort: '80',
      HealthCheckPath: '/health',
      HealthCheckIntervalSeconds: 30,
      HealthCheckTimeoutSeconds: 10,
      HealthyThresholdCount: 2,
      UnhealthyThresholdCount: 5,
      HealthCheckGracePeriodSeconds: 120,
      Matcher: { HttpCode: '200' }
    }));

    const targetGroupArn = tgResp.TargetGroups[0].TargetGroupArn;

    // 3. Create ALB listener rule for subdomain 
    await elbClient.send(new CreateRuleCommand({
      ListenerArn: process.env.ALB_LISTENER_ARN,
      Conditions: [{ Field: 'host-header', Values: [`${deploymentId}.deploy.0gnodehub.com`] }],
      Priority: Math.floor(Math.random() * 50000),
      Actions: [{ Type: 'forward', TargetGroupArn: targetGroupArn }]
    }));

    // 4. Create ECS Service 
    const serviceArn = await createECSService(deploymentId, taskDefinitionArn, targetGroupArn);

    // 5. Save deployment record
    const deploymentRecord = {
      walletAddress,
      deploymentId,
      publicEndpoint: `https://${deploymentId}.deploy.0gnodehub.com`,
      status: 'DEPLOYING',
      modelService,
      modelIdentifier,
      verificationMethod,
      serviceArn,
      taskDefinitionArn,
      targetGroupArn,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveToDynamoDB(deploymentRecord);

    console.log(`Deployment initiated successfully: ${deploymentId} at ${deploymentRecord.publicEndpoint}`);

    return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, deploymentId, url: deploymentRecord.publicEndpoint }) };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ success: false, error: error.message || 'Internal server error' })
    };
  }
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
  };
}

async function createMultiContainerTaskDefinition(deploymentId) {
  console.log('Creating multi-container task definition for:', deploymentId);

  const taskDefinition = {
    family: `nodehub-instance-${deploymentId}`,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '512',
    memory: '1024',
    executionRoleArn: process.env.ECS_EXECUTION_ROLE_ARN,
    taskRoleArn: process.env.ECS_TASK_ROLE_ARN,  // Add task role for S3 access
    containerDefinitions: [
      // Container 0: Config Init (runs first, downloads configs)
      {
        name: 'config-init',
        image: 'amazonlinux:2023',
        essential: false,
        environment: [
          { name: 'CONFIG_S3_BUCKET', value: process.env.CONFIG_BUCKET },
          { name: 'DEPLOYMENT_ID', value: deploymentId },
          { name: 'AWS_DEFAULT_REGION', value: process.env.AWS_REGION || 'ap-southeast-1' }
        ],
        command: [
          '/bin/bash',
          '-c',
          'yum update -y && yum install -y aws-cli && ' +
          `echo "Downloading configs for ${deploymentId}..." && ` +
          'aws s3 cp s3://$CONFIG_S3_BUCKET/' + `${deploymentId}/config.yaml /shared/config.yaml && ` +
          'aws s3 cp s3://$CONFIG_S3_BUCKET/' + `${deploymentId}/nginx.conf /shared/nginx.conf && ` +
          'echo "Config files downloaded successfully" && ' +
          'ls -la /shared/'
        ],
        mountPoints: [
          {
            sourceVolume: 'shared-config',
            containerPath: '/shared'
          }
        ],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': '/ecs/nodehub',
            'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
            'awslogs-stream-prefix': `${deploymentId}-config-init`,
            'awslogs-create-group': 'true'
          }
        }
      },
      // Container 1: 0g-serving-provider-broker
      {
        name: '0g-serving-provider-broker',
        image: 'ghcr.io/0glabs/0g-serving-broker:0.2.1',
        essential: true,
        portMappings: [{ containerPort: 3080, protocol: 'tcp' }],
        environment: [
          { name: 'PORT', value: '3080' },
          { name: 'CONFIG_FILE', value: '/etc/config.yaml' },
          { name: 'MYSQL_HOST', value: process.env.MYSQL_HOST },
          { name: 'MYSQL_PORT', value: process.env.MYSQL_PORT },
          { name: 'MYSQL_DATABASE', value: process.env.MYSQL_DATABASE },
          { name: 'MYSQL_USER', value: process.env.MYSQL_USER },
          { name: 'MYSQL_PASSWORD', value: process.env.MYSQL_PASSWORD },
          { name: 'ZK_PROVER_URL', value: process.env.ZK_PROVER_URL },
          { name: 'DEPLOYMENT_ID', value: deploymentId },
          { name: 'CONFIG_S3_BUCKET', value: process.env.CONFIG_BUCKET },
          { name: 'CONFIG_S3_KEY', value: `${deploymentId}/config.yaml` }
        ],
        command: ['0g-inference-server'],
        mountPoints: [
          {
            sourceVolume: 'shared-config',
            containerPath: '/etc/configs',
            readOnly: true
          }
        ],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': '/ecs/nodehub',
            'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
            'awslogs-stream-prefix': `${deploymentId}-broker`,
            'awslogs-create-group': 'true'
          }
        },
        healthCheck: {
          command: ['CMD-SHELL', 'curl -f http://localhost:3080/health || exit 1'],
          interval: 30,
          timeout: 10,
          retries: 3,
          startPeriod: 60
        },
        dependsOn: [
          {
            containerName: 'config-init',
            condition: 'SUCCESS'
          }
        ]
      },
      // Container 2: 0g-serving-provider-event
      {
        name: '0g-serving-provider-event',
        image: 'ghcr.io/0glabs/0g-serving-broker:0.2.1',
        essential: true,
        environment: [
          { name: 'CONFIG_FILE', value: '/etc/config.yaml' },
          { name: 'MYSQL_HOST', value: process.env.MYSQL_HOST },
          { name: 'MYSQL_PORT', value: process.env.MYSQL_PORT },
          { name: 'MYSQL_DATABASE', value: process.env.MYSQL_DATABASE },
          { name: 'MYSQL_USER', value: process.env.MYSQL_USER },
          { name: 'MYSQL_PASSWORD', value: process.env.MYSQL_PASSWORD },
          { name: 'ZK_SETTLEMENT_URL', value: process.env.ZK_SETTLEMENT_URL },
          { name: 'DEPLOYMENT_ID', value: deploymentId }
        ],
        command: ['0g-inference-event'],
        mountPoints: [
          {
            sourceVolume: 'shared-config',
            containerPath: '/etc/configs',
            readOnly: true
          }
        ],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': '/ecs/nodehub',
            'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
            'awslogs-stream-prefix': `${deploymentId}-event`,
            'awslogs-create-group': 'true'
          }
        },
        dependsOn: [
          {
            containerName: 'config-init',
            condition: 'SUCCESS'
          },
          {
            containerName: '0g-serving-provider-broker',
            condition: 'HEALTHY'
          }
        ]
      },
      // Container 3: nginx
      {
        name: 'nginx',
        image: 'nginx:1.27.0',
        essential: true,
        portMappings: [{ containerPort: 80, protocol: 'tcp' }],
        mountPoints: [
          {
            sourceVolume: 'shared-config',
            containerPath: '/etc/nginx',
            readOnly: true
          }
        ],
        command: [
          '/bin/bash',
          '-c',
          'cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak && nginx -g "daemon off;"'
        ],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': '/ecs/nodehub',
            'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
            'awslogs-stream-prefix': `${deploymentId}-nginx`,
            'awslogs-create-group': 'true'
          }
        },
        healthCheck: {
          command: ['CMD-SHELL', 'curl -f http://localhost:80/health || exit 1'],
          interval: 30,
          timeout: 5,
          retries: 3,
          startPeriod: 30
        },
        dependsOn: [
          {
            containerName: 'config-init',
            condition: 'SUCCESS'
          },
          {
            containerName: '0g-serving-provider-broker',
            condition: 'HEALTHY'
          }
        ]
      }
    ],
    volumes: [
      {
        name: 'shared-config',
        host: {}
      }
    ]
  };

  const response = await ecsClient.send(new RegisterTaskDefinitionCommand(taskDefinition));
  return response.taskDefinition.taskDefinitionArn;
}

async function createECSService(deploymentId, taskDefinitionArn, targetGroupArn) {
  console.log('Creating ECS service for:', deploymentId);

  const response = await ecsClient.send(new CreateServiceCommand({
    cluster: process.env.CLUSTER_NAME,
    serviceName: `nodehub-${deploymentId}`,
    taskDefinition: taskDefinitionArn,
    desiredCount: 1,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: process.env.SUBNETS.split(','),
        assignPublicIp: 'ENABLED',
        securityGroups: [process.env.CONTAINER_SECURITY_GROUP_ID]
      }
    },
    loadBalancers: [{
      targetGroupArn: targetGroupArn,
      containerName: 'nginx',  // Changed to nginx
      containerPort: 80        // Changed to port 80
    }]
  }));

  return response.service.serviceArn;
}

async function saveToDynamoDB(record) {
  await dynamoClient.send(new PutItemCommand({
    TableName: process.env.DEPLOYMENTS_TABLE,
    Item: marshall(record, {
      removeUndefinedValues: true
    })
  }));
}

async function createConfigFiles(deploymentId, deploymentParams) {
  console.log('Creating config files for:', deploymentId);

  const { walletAddress, modelService, modelIdentifier } = deploymentParams;
  
  // Base config template
  const configTemplate = {
    server: {
      host: '0.0.0.0',
      port: 3080
    },
    database: {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      database: process.env.MYSQL_DATABASE,
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD
    },
    zk: {
      prover_url: process.env.ZK_PROVER_URL,
      settlement_url: process.env.ZK_SETTLEMENT_URL
    },
    deployment: {
      id: deploymentId,
      wallet_address: walletAddress,
      model_service: modelService,
      model_identifier: modelIdentifier
    },
    logging: {
      level: 'info',
      format: 'json'
    }
  };

  // Nginx config template
  const nginxConfig = `events { 
  worker_connections 1024;
}

http {
  upstream broker {
    server localhost:3080;
  }

  server {
    listen 80;
    
    # Health check endpoint
    location /health {
      return 200 '{"status":"healthy","service":"nginx-proxy","deployment":"${deploymentId}"}';
      add_header Content-Type application/json;
    }
    
    # Nginx status endpoint
    location /stub_status {
      stub_status on;
      allow 127.0.0.1;
      allow 172.16.0.0/12;
      deny all;
    }
    
    # Public API endpoints
    location /v1/proxy {
      proxy_pass http://broker;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /v1/quote {
      proxy_pass http://broker;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Default location - restricted access
    location / {
      allow 127.0.0.1;
      allow 172.16.0.0/12;
      deny all;
      proxy_pass http://broker;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }
}
`;

  // Upload config files to S3
  await Promise.all([
    s3Client.send(new PutObjectCommand({
      Bucket: process.env.CONFIG_BUCKET,
      Key: `${deploymentId}/config.yaml`,
      Body: JSON.stringify(configTemplate, null, 2),
      ContentType: 'application/yaml'
    })),
    s3Client.send(new PutObjectCommand({
      Bucket: process.env.CONFIG_BUCKET,
      Key: `${deploymentId}/nginx.conf`,
      Body: nginxConfig,
      ContentType: 'text/plain'
    }))
  ]);

  console.log(`Config files uploaded for deployment: ${deploymentId}`);
}
