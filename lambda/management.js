// lambda/management.js
const { ECSClient, DescribeServicesCommand, DeleteServiceCommand, UpdateServiceCommand } = require("@aws-sdk/client-ecs");
const { ElasticLoadBalancingV2Client, DeleteTargetGroupCommand, DeleteRuleCommand } = require("@aws-sdk/client-elastic-load-balancing-v2");
const { EC2Client, DeleteSecurityGroupCommand } = require("@aws-sdk/client-ec2");
const { DynamoDBClient, QueryCommand, GetItemCommand, DeleteItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { CloudWatchLogsClient, FilterLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const ecsClient = new ECSClient({});
const elbClient = new ElasticLoadBalancingV2Client({});
const ec2Client = new EC2Client({});
const dynamoClient = new DynamoDBClient({});
const logsClient = new CloudWatchLogsClient({});

exports.handler = async (event) => {
  console.log('Management request:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, pathParameters, queryStringParameters } = event;
    
    if (httpMethod === 'GET' && pathParameters.walletAddress && !pathParameters.deploymentId) {
      // Get all deployments for a wallet
      return await getWalletDeployments(pathParameters.walletAddress, queryStringParameters);
    }
    
    if (httpMethod === 'GET' && pathParameters.deploymentId) {
      // Get specific deployment
      return await getDeployment(pathParameters.walletAddress, pathParameters.deploymentId, queryStringParameters);
    }
    
    if (httpMethod === 'DELETE' && pathParameters.deploymentId) {
      // Delete deployment
      return await deleteDeployment(pathParameters.walletAddress, pathParameters.deploymentId);
    }
    
    return {
      statusCode: 405,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Management error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function getWalletDeployments(walletAddress, queryParams) {
  try {
    const params = {
      TableName: process.env.DEPLOYMENTS_TABLE,
      KeyConditionExpression: 'walletAddress = :walletAddress',
      ExpressionAttributeValues: marshall({
        ':walletAddress': walletAddress
      }),
      ScanIndexForward: false // Sort by sortKey descending (newest first)
    };

    // Add status filter if provided
    if (queryParams && queryParams.status) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames = { '#status': 'status' };
      params.ExpressionAttributeValues[':status'] = marshall(queryParams.status).S;
    }

    const result = await dynamoClient.send(new QueryCommand(params));
    const deployments = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        deployments,
        count: deployments.length
      })
    };

  } catch (error) {
    console.error('Error fetching wallet deployments:', error);
    throw error;
  }
}

async function getDeployment(walletAddress, deploymentId, queryParams) {
  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Key: marshall({ walletAddress, deploymentId })
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Deployment not found' })
      };
    }

    const deployment = unmarshall(result.Item);

    // Get logs if requested
    if (queryParams && queryParams.logs === 'true') {
      try {
        const logEvents = await logsClient.send(new FilterLogEventsCommand({
          logGroupName: '/ecs/nodehub',
          logStreamNamePrefix: deploymentId,
          limit: 100,
          startTime: Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
        }));

        deployment.logs = logEvents.events ? logEvents.events.map(event => ({
          timestamp: new Date(event.timestamp).toISOString(),
          message: event.message
        })) : [];
      } catch (logError) {
        console.error('Error fetching logs:', logError);
        deployment.logs = [];
      }
    }

    // Get service status if available
    if (deployment.serviceArn) {
      try {
        const services = await ecsClient.send(new DescribeServicesCommand({
          cluster: process.env.CLUSTER_NAME,
          services: [deployment.serviceArn]
        }));

        if (services.services && services.services.length > 0) {
          const service = services.services[0];
          deployment.serviceStatus = {
            runningCount: service.runningCount,
            pendingCount: service.pendingCount,
            desiredCount: service.desiredCount,
            status: service.status,
            taskDefinition: service.taskDefinition
          };
        }
      } catch (serviceError) {
        console.error('Error fetching service status:', serviceError);
      }
    }

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify(deployment)
    };

  } catch (error) {
    console.error('Error fetching deployment:', error);
    throw error;
  }
}

async function deleteDeployment(walletAddress, deploymentId) {
  try {
    // Get deployment details first
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Key: marshall({ walletAddress, deploymentId })
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Deployment not found' })
      };
    }

    const deployment = unmarshall(result.Item);

    // Update status to DELETING
    deployment.status = 'DELETING';
    deployment.updatedAt = new Date().toISOString();
    
    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Item: marshall(deployment)
    }));

    // Delete AWS resources
    const deletePromises = [];

    // Delete ECS service
    if (deployment.serviceArn) {
      deletePromises.push(
        ecsClient.send(new UpdateServiceCommand({
          cluster: process.env.CLUSTER_NAME,
          service: deployment.serviceArn,
          desiredCount: 0
        })).then(() =>
          ecsClient.send(new DeleteServiceCommand({
            cluster: process.env.CLUSTER_NAME,
            service: deployment.serviceArn,
            force: true
          }))
        )
      );
    }

    // Delete ALB target group
    if (deployment.targetGroupArn) {
      deletePromises.push(
        elbClient.send(new DeleteTargetGroupCommand({
          TargetGroupArn: deployment.targetGroupArn
        }))
      );
    }

    // Delete ALB listener rule
    if (deployment.ruleArn) {
      deletePromises.push(
        elbClient.send(new DeleteRuleCommand({
          RuleArn: deployment.ruleArn
        }))
      );
    }

    // Delete security group (with retry logic)
    if (deployment.securityGroupId) {
      deletePromises.push(
        // Wait a bit before deleting security group to allow service to stop
        new Promise(resolve => setTimeout(resolve, 30000)).then(() =>
          ec2Client.send(new DeleteSecurityGroupCommand({
            GroupId: deployment.securityGroupId
          })).catch(err => {
            console.error('Error deleting security group:', err);
            // Don't fail the whole operation if security group deletion fails
          })
        )
      );
    }

    // Wait for all deletions to complete
    await Promise.allSettled(deletePromises);

    // Delete from DynamoDB
    await dynamoClient.send(new DeleteItemCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Key: marshall({ walletAddress, deploymentId })
    }));

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({ 
        success: true,
        message: 'Deployment deleted successfully'
      })
    };

  } catch (error) {
    console.error('Error deleting deployment:', error);
    
    // Update status to DELETE_FAILED if deletion fails
    try {
      await dynamoClient.send(new PutItemCommand({
        TableName: process.env.DEPLOYMENTS_TABLE,
        Item: marshall({
          walletAddress,
          deploymentId,
          status: 'DELETE_FAILED',
          errorMessage: error.message,
          updatedAt: new Date().toISOString()
        }, {
          removeUndefinedValues: true
        })
      }));
    } catch (updateError) {
      console.error('Error updating deletion status:', updateError);
    }

    throw error;
  }
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
  };
}