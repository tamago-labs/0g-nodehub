// lambda/management.js
const { ECSClient, DescribeServicesCommand, DeleteServiceCommand, UpdateServiceCommand } = require("@aws-sdk/client-ecs");
const { ElasticLoadBalancingV2Client, DeleteTargetGroupCommand, DescribeRulesCommand, DeleteRuleCommand } = require("@aws-sdk/client-elastic-load-balancing-v2");
const { DynamoDBClient, QueryCommand, GetItemCommand, DeleteItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { CloudWatchLogsClient, FilterLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const ecsClient = new ECSClient({});
const elbClient = new ElasticLoadBalancingV2Client({});
const dynamoClient = new DynamoDBClient({});
const logsClient = new CloudWatchLogsClient({});
const s3Client = new S3Client({});

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

async function checkHealthEndpoint(publicEndpoint) {
  try {
    const healthUrl = `${publicEndpoint}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 10000 // 10 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        healthy: true,
        status: 'ACTIVE',
        healthData: data
      };
    } else {
      return {
        healthy: false,
        status: 'DEPLOYED', // Service exists but not healthy
        error: `Health check failed: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
    return {
      healthy: false,
      status: 'DEPLOYED', // Assume service is deployed but not responding
      error: error.message
    };
  }
}

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
    let deployments = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    // Update status for each deployment
    const updatedDeployments = await Promise.all(
      deployments.map(async (deployment) => {
        try {
          let updatedDeployment = { ...deployment };
          let needsUpdate = false;

          // Check ECS service status
          if (deployment.serviceArn) {
            const services = await ecsClient.send(new DescribeServicesCommand({
              cluster: process.env.CLUSTER_NAME,
              services: [deployment.serviceArn]
            }));

            if (services.services && services.services.length > 0) {
              const service = services.services[0];
              
              let newStatus = 'DEPLOYING';
              if (service.status === "ACTIVE" && service.runningCount > 0) {
                // Service is active, now check health endpoint if available
                if (deployment.publicEndpoint) {
                  const healthCheck = await checkHealthEndpoint(deployment.publicEndpoint);
                  newStatus = healthCheck.status;
                } else {
                  newStatus = 'DEPLOYED';
                }
              } else if (service.status === "DRAINING") {
                newStatus = 'DELETING';
              } else if (service.runningCount === 0 && service.deployments.length === 0) {
                newStatus = 'FAILED';
              }

              // Update status if changed
              if (updatedDeployment.status !== newStatus) {
                updatedDeployment.status = newStatus;
                updatedDeployment.updatedAt = new Date().toISOString();
                needsUpdate = true;
              }
            }
          } else if (deployment.publicEndpoint && deployment.status === 'DEPLOYING') {
            // Check health endpoint directly for deployments without serviceArn
            const healthCheck = await checkHealthEndpoint(deployment.publicEndpoint);
            if (healthCheck.healthy && deployment.status !== 'ACTIVE') {
              updatedDeployment.status = 'ACTIVE';
              updatedDeployment.updatedAt = new Date().toISOString();
              needsUpdate = true;
            }
          }

          // Update database if status changed
          if (needsUpdate) {
            await dynamoClient.send(new PutItemCommand({
              TableName: process.env.DEPLOYMENTS_TABLE,
              Item: marshall(updatedDeployment)
            }));
          }

          return updatedDeployment;
        } catch (error) {
          console.error(`Error updating deployment ${deployment.deploymentId}:`, error);
          return deployment; // Return original if update fails
        }
      })
    );

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        deployments: updatedDeployments,
        count: updatedDeployments.length
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

    let deployment = unmarshall(result.Item);
    let dbNeedsUpdate = false;

    // Check ECS service status if available
    if (deployment.serviceArn) {
      try {
        const services = await ecsClient.send(new DescribeServicesCommand({
          cluster: process.env.CLUSTER_NAME,
          services: [deployment.serviceArn]
        }));

        if (services.services && services.services.length > 0) {
          const service = services.services[0];
          
          let actualStatus = 'DEPLOYING';
          if (service.status === "ACTIVE" && service.runningCount > 0) {
            // Check health endpoint if available
            if (deployment.publicEndpoint) {
              const healthCheck = await checkHealthEndpoint(deployment.publicEndpoint);
              actualStatus = healthCheck.status;
              deployment.healthCheck = healthCheck;
            } else {
              actualStatus = 'DEPLOYED';
            }
          } else if (service.status === "DRAINING") {
            actualStatus = 'DELETING';
          } else if (service.runningCount === 0 && service.deployments.length === 0) {
            actualStatus = 'FAILED';
          }

          // Update if status changed
          if (deployment.status !== actualStatus) {
            deployment.status = actualStatus;
            deployment.updatedAt = new Date().toISOString();
            dbNeedsUpdate = true;
          }

          // Keep live service info
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
    } else if (deployment.publicEndpoint && deployment.status === 'DEPLOYING') {
      // Direct health check for deployments without serviceArn
      const healthCheck = await checkHealthEndpoint(deployment.publicEndpoint);
      deployment.healthCheck = healthCheck;
      
      if (healthCheck.healthy && deployment.status !== 'ACTIVE') {
        deployment.status = 'ACTIVE';
        deployment.updatedAt = new Date().toISOString();
        dbNeedsUpdate = true;
      }
    }

    // Update DynamoDB only if status changed
    if (dbNeedsUpdate) {
      await dynamoClient.send(new PutItemCommand({
        TableName: process.env.DEPLOYMENTS_TABLE,
        Item: marshall(deployment)
      }));
    }

    // Attach logs if requested
    if (queryParams && queryParams.logs === 'true') {
      try {
        const logEvents = await logsClient.send(new FilterLogEventsCommand({
          logGroupName: '/ecs/nodehub',
          logStreamNamePrefix: deploymentId,
          limit: 100,
          startTime: Date.now() - (24 * 60 * 60 * 1000)
        }));

        deployment.logs = logEvents.events?.map(event => ({
          timestamp: new Date(event.timestamp).toISOString(),
          message: event.message
        })) || [];
      } catch (logError) {
        console.error('Error fetching logs:', logError);
        deployment.logs = [];
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

    // 1. Delete ECS service
    if (deployment.serviceArn) {
      console.log('Deleting ECS service:', deployment.serviceArn);
      deletePromises.push(
        ecsClient.send(new UpdateServiceCommand({
          cluster: process.env.CLUSTER_NAME,
          service: deployment.serviceArn,
          desiredCount: 0
        })).then(() => 
          // Wait a bit for tasks to stop
          new Promise(resolve => setTimeout(resolve, 10000))
        ).then(() =>
          ecsClient.send(new DeleteServiceCommand({
            cluster: process.env.CLUSTER_NAME,
            service: deployment.serviceArn,
            force: true
          }))
        ).catch(err => {
          console.error('Error deleting ECS service:', err);
          // Don't fail the whole operation
        })
      );
    }

    // 2. Delete ALB target group
    if (deployment.targetGroupArn) {
      console.log('Deleting target group:', deployment.targetGroupArn);
      deletePromises.push(
        // Wait for ECS service to be deleted first
        new Promise(resolve => setTimeout(resolve, 20000)).then(() =>
          elbClient.send(new DeleteTargetGroupCommand({
            TargetGroupArn: deployment.targetGroupArn
          }))
        ).catch(err => {
          console.error('Error deleting target group:', err);
        })
      );
    }

    // 3. Delete ALB listener rule (find by host header pattern)
    if (process.env.ALB_LISTENER_ARN) {
      console.log('Looking for ALB rules to delete for deployment:', deploymentId);
      deletePromises.push(
        elbClient.send(new DescribeRulesCommand({
          ListenerArn: process.env.ALB_LISTENER_ARN
        })).then(rules => {
          const deploymentRule = rules.Rules?.find(rule => 
            rule.Conditions?.some(condition => 
              condition.Values?.some(value => 
                value.includes(`${deploymentId}.deploy.0gnodehub.com`)
              )
            )
          );
          
          if (deploymentRule && deploymentRule.RuleArn) {
            console.log('Found ALB rule to delete:', deploymentRule.RuleArn);
            return elbClient.send(new DeleteRuleCommand({
              RuleArn: deploymentRule.RuleArn
            }));
          }
        }).catch(err => {
          console.error('Error deleting ALB rule:', err);
        })
      );
    }

    // 4. Delete S3 config files
    if (process.env.CONFIG_BUCKET) {
      console.log('Deleting S3 config files for deployment:', deploymentId);
      deletePromises.push(
        Promise.all([
          s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.CONFIG_BUCKET,
            Key: `${deploymentId}/config.yaml`
          })),
          s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.CONFIG_BUCKET,
            Key: `${deploymentId}/nginx.conf`
          }))
        ]).catch(err => {
          console.error('Error deleting S3 config files:', err);
        })
      );
    }

    // Wait for all deletions to complete
    console.log('Waiting for all AWS resources to be deleted...');
    await Promise.allSettled(deletePromises);

    // Delete from DynamoDB
    await dynamoClient.send(new DeleteItemCommand({
      TableName: process.env.DEPLOYMENTS_TABLE,
      Key: marshall({ walletAddress, deploymentId })
    }));

    console.log('Deployment deleted successfully:', deploymentId);

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        success: true,
        message: 'Deployment deleted successfully',
        deploymentId
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
