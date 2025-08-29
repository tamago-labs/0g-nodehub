// lambda/deployment.js
const { ECSClient, RegisterTaskDefinitionCommand, CreateServiceCommand, DescribeTasksCommand } = require("@aws-sdk/client-ecs");
const { EC2Client, DescribeNetworkInterfacesCommand } = require("@aws-sdk/client-ec2");
const { ElasticLoadBalancingV2Client, CreateTargetGroupCommand, CreateRuleCommand } = require('@aws-sdk/client-elastic-load-balancing-v2');
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

const ecsClient = new ECSClient({});
const ec2Client = new EC2Client({});
const elbClient = new ElasticLoadBalancingV2Client({});
const dynamoClient = new DynamoDBClient({});

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

    // 1. Create Task Definition
    const taskDefinitionArn = await createTaskDefinition(deploymentId);

    // 2. Create ALB Target Group
    const tgResp = await elbClient.send(new CreateTargetGroupCommand({
      Name: `tg-${deploymentId.slice(-8)}`, // ALB limit
      Port: 3000,
      Protocol: 'HTTP',
      VpcId: process.env.VPC_ID,
      TargetType: 'ip',
      HealthCheckProtocol: 'HTTP',
      HealthCheckPort: '3000',
      HealthCheckPath: '/health'
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

    console.log(`Deployment initiated successfully: ${deploymentId} at ${deploymentRecord.url}`);

    return { statusCode: 200, headers: getCorsHeaders(), body: JSON.stringify({ success: true, deploymentId, url: deploymentRecord.url }) };

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

async function createTaskDefinition(deploymentId) {
  console.log('Creating task definition for:', deploymentId);

  const taskDefinition = {
    family: `nodehub-instance-${deploymentId}`,
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '256',
    memory: '512',
    executionRoleArn: process.env.ECS_EXECUTION_ROLE_ARN,
    // taskRoleArn: process.env.ECS_EXECUTION_ROLE_ARN,
    containerDefinitions: [{
      name: 'nodejs-app',
      image: '057386374967.dkr.ecr.ap-southeast-1.amazonaws.com/nodehub-simple:latest',
      essential: true,
      portMappings: [{ containerPort: 3000, protocol: 'tcp' }],
      environment: [
        { name: 'PORT', value: '3000' },
        { name: 'DEPLOYMENT_ID', value: deploymentId },
        { name: 'MESSAGE', value: 'Hello from Simple NodeHub!' }
      ],
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': '/ecs/nodehub',
          'awslogs-region': process.env.AWS_REGION || 'ap-southeast-1',
          'awslogs-stream-prefix': `${deploymentId}-proxy`,
          'awslogs-create-group': 'true'
        }
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1'],
        interval: 30,
        timeout: 5,
        retries: 3,
        startPeriod: 60 // Give more time for container to start
      }
    }]
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
      containerName: 'nodejs-app',
      containerPort: 3000
    }]
  }));

  return response.service.serviceArn;
}

async function getServiceEndpoint(clusterName, taskIdOrArn) {
  console.log("Fetching service endpoint for:", taskIdOrArn);

  // Wait briefly for task startup (in production: poll with backoff instead)
  await new Promise((r) => setTimeout(r, 10000));

  // Describe the ECS task directly by taskId or taskArn
  const describeResp = await ecsClient.send(
    new DescribeTasksCommand({
      cluster: clusterName,
      tasks: [taskIdOrArn], // must be real taskId or full taskArn
    })
  );

  if (!describeResp.tasks || describeResp.tasks.length === 0) {
    return { publicIp: null, publicDns: null };
  }

  const task = describeResp.tasks[0];
  const eni = task.attachments[0].details.find(
    (d) => d.name === "networkInterfaceId"
  )?.value;

  if (!eni) {
    return { publicIp: null, publicDns: null };
  }

  const eniDesc = await ec2Client.send(
    new DescribeNetworkInterfacesCommand({
      NetworkInterfaceIds: [eni],
    })
  );

  const assoc = eniDesc.NetworkInterfaces[0].Association || {};
  return {
    publicIp: assoc.PublicIp || null,
    publicDns: assoc.PublicDnsName || null,
  };
}

async function saveToDynamoDB(record) {
  await dynamoClient.send(new PutItemCommand({
    TableName: process.env.DEPLOYMENTS_TABLE,
    Item: marshall(record, {
      removeUndefinedValues: true
    })
  }));
}
