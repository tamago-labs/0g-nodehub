import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export class MainStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;
    public readonly api: apigateway.RestApi;
    public readonly cluster: ecs.Cluster;
    public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    public readonly hostedZone: route53.IHostedZone;
    public readonly certificate: acm.ICertificate;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ========================================
        // DOMAIN AND CERTIFICATE SETUP
        // ========================================

        const zoneName = '0gnodehub.com'; // The root domain
        const domainName = 'app.0gnodehub.com';
        const deploymentDomain = 'deploy.0gnodehub.com'; // Base domain for deployments
        const certificateArn = 'arn:aws:acm:us-east-1:057386374967:certificate/8bdf3cbf-c1bd-474c-a2f3-9e200e4f2d26';
        const brokerImageUri = '057386374967.dkr.ecr.ap-southeast-1.amazonaws.com/0g-inference-broker:latest'; // V.2.1

        // Look up the existing hosted zone
        this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: zoneName,
        });

        // Import the manually created certificate
        this.certificate = acm.Certificate.fromCertificateArn(
            this,
            'Certificate',
            certificateArn
        );

        const certificate2 = acm.Certificate.fromCertificateArn(
            this,
            'Certificate2',
            "arn:aws:acm:ap-southeast-1:057386374967:certificate/2cc7f434-5214-467d-b9d2-bec3bbf25103"
        );

        // ========================================
        // NETWORKING - VPC and Load Balancer
        // ========================================

        const vpc = new ec2.Vpc(this, 'InferenceVPC', {
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                }
            ]
        });

        // ECS Cluster for running inference providers
        this.cluster = new ecs.Cluster(this, 'InferenceCluster', {
            vpc,
            clusterName: '0g-inference-providers',
            containerInsights: true,
        });

        // Add Fargate capacity
        this.cluster.addCapacity('DefaultAutoScalingGroup', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
            desiredCapacity: 1,
            maxCapacity: 2,
            minCapacity: 1,
        });

        // Application Load Balancer
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'nodehub-alb',
        });

        // HTTPS listener with SSL certificate
        const httpsListener = this.loadBalancer.addListener('HTTPSListener', {
            port: 443,
            certificates: [certificate2],
            defaultAction: elbv2.ListenerAction.fixedResponse(404, {
                contentType: 'application/json',
                messageBody: JSON.stringify({
                    error: 'Service not found',
                    message: 'No deployment found for this subdomain'
                }),
            }),
        });

        // HTTP listener that redirects to HTTPS
        this.loadBalancer.addListener('HTTPListener', {
            port: 80,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: 'HTTPS',
                port: '443',
                permanent: true,
            }),
        });


        // Create wildcard A record for *.deploy.0gnodehub.com -> Load Balancer
        new route53.ARecord(this, 'DeploymentWildcardRecord', {
            zone: this.hostedZone,
            recordName: '*.deploy', // This creates *.deploy.0gnodehub.com
            target: route53.RecordTarget.fromAlias(
                new targets.LoadBalancerTarget(this.loadBalancer)
            ),
        });

        // ========================================
        // CONTAINER REGISTRY - ECR
        // ========================================


        const ecrRepository = new ecr.Repository(this, 'InferenceRegistry', {
            repositoryName: '0g-inference-broker',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            imageTagMutability: ecr.TagMutability.MUTABLE,
        });

        // ========================================
        // DATABASE - DynamoDB
        // ========================================

        const deploymentsTable = new dynamodb.Table(this, 'DeploymentsTable', {
            tableName: 'nodehub-deployments',
            partitionKey: { name: 'walletAddress', type: dynamodb.AttributeType.STRING }, // use wallet address connected
            sortKey: { name: 'deploymentId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Add GSI for querying by status
        deploymentsTable.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });

        // ========================================
        // LAMBDA FUNCTIONS
        // ========================================

        // CloudWatch Log Group for Lambda functions
        const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
            logGroupName: '/aws/lambda/nodehub',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Deployment Lambda Function
        const deploymentFunction = new lambda.Function(this, 'DeploymentFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'deployment.handler',
            code: lambda.Code.fromAsset('lambda'),
            timeout: cdk.Duration.minutes(15),
            memorySize: 1024,
            logGroup: lambdaLogGroup,
            environment: {
                CLUSTER_NAME: this.cluster.clusterName,
                DEPLOYMENTS_TABLE: deploymentsTable.tableName,
                VPC_ID: vpc.vpcId,
                ALB_ARN: this.loadBalancer.loadBalancerArn,
                HTTPS_LISTENER_ARN: httpsListener.listenerArn,
                ECR_REPOSITORY_URI: ecrRepository.repositoryUri,
                BROKER_IMAGE_URI: brokerImageUri,
                SUBNETS: vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
                DOMAIN_NAME: zoneName,
                DEPLOYMENT_DOMAIN: deploymentDomain,
                HOSTED_ZONE_ID: this.hostedZone.hostedZoneId,
                LOAD_BALANCER_DNS: this.loadBalancer.loadBalancerDnsName
            },
        });

        // Management Lambda Function
        const managementFunction = new lambda.Function(this, 'ManagementFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'management.handler',
            code: lambda.Code.fromAsset('lambda'),
            timeout: cdk.Duration.minutes(5),
            logGroup: lambdaLogGroup,
            environment: {
                CLUSTER_NAME: this.cluster.clusterName,
                DEPLOYMENTS_TABLE: deploymentsTable.tableName,
            },
        });

        // ========================================
        // BECKEND PERMISSIONS
        // ========================================
        deploymentsTable.grantReadWriteData(deploymentFunction);
        deploymentsTable.grantReadWriteData(managementFunction);
        ecrRepository.grantPullPush(deploymentFunction);

        // ECS and Load Balancer permissions
        const ecsPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ecs:*',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DescribeSubnets',
                'ec2:DescribeSecurityGroups',
                'ec2:CreateSecurityGroup',
                'ec2:AuthorizeSecurityGroupIngress',
                'elasticloadbalancing:*',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:FilterLogEvents',
                'logs:DescribeLogStreams'
            ],
            resources: ['*']
        });

        deploymentFunction.addToRolePolicy(ecsPolicy);
        managementFunction.addToRolePolicy(ecsPolicy);

        // Route53 permissions for creating subdomains
        const route53Policy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'route53:ChangeResourceRecordSets',
                'route53:GetHostedZone',
                'route53:ListResourceRecordSets'
            ],
            resources: [
                `arn:aws:route53:::hostedzone/${this.hostedZone.hostedZoneId}`
            ]
        });

        deploymentFunction.addToRolePolicy(route53Policy);
        managementFunction.addToRolePolicy(route53Policy);

        // ========================================
        // API GATEWAY
        // ========================================
        this.api = new apigateway.RestApi(this, 'NodeHubProviderAPI', {
            restApiName: 'NodeHub API',
            description: 'API for managing 0G node deployments',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
            },
        });

        // API Resources
        const deploymentsResource = this.api.root.addResource('deployments');
        const walletResource = deploymentsResource.addResource('{walletAddress}');
        const deploymentResource = walletResource.addResource('{deploymentId}');

        // API Methods (no authentication for now)
        deploymentsResource.addMethod('POST', new apigateway.LambdaIntegration(deploymentFunction));
        walletResource.addMethod('GET', new apigateway.LambdaIntegration(managementFunction));
        deploymentResource.addMethod('GET', new apigateway.LambdaIntegration(managementFunction));
        deploymentResource.addMethod('DELETE', new apigateway.LambdaIntegration(managementFunction));

        // ========================================
        // FRONTEND
        // ========================================

        // S3 bucket for hosting the static site
        this.bucket = new s3.Bucket(this, 'FrontendBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // CloudFront Origin Access Identity
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'NODEHUB', {
            comment: `NodeHub Dashboard`
        });

        // Grant CloudFront access to S3
        this.bucket.grantRead(originAccessIdentity);

        // CloudFront distribution
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            domainNames: [domainName],
            certificate: this.certificate,
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
            ],
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket, {
                    originAccessIdentity,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
                    cachePolicyName: `nodehub-cache-policy-${cdk.Aws.ACCOUNT_ID}`,
                    defaultTtl: cdk.Duration.hours(24),
                    maxTtl: cdk.Duration.days(365),
                    minTtl: cdk.Duration.seconds(0),
                    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
                    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
                    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
                }),
            },
            additionalBehaviors: {
                // Cache API calls for a shorter time
                '/api/*': {
                    origin: new origins.S3Origin(this.bucket, {
                        originAccessIdentity,
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                },
            },
        });

        // Create A record to point domain to CloudFront
        new route53.ARecord(this, 'AliasRecord', {
            zone: this.hostedZone,
            recordName: 'app', // This creates app.0gnodehub.com
            target: route53.RecordTarget.fromAlias(
                new targets.CloudFrontTarget(this.distribution)
            ),
        });

        // Optional: Create AAAA record for IPv6 support
        new route53.AaaaRecord(this, 'AliasRecordAAAA', {
            zone: this.hostedZone,
            recordName: 'app',
            target: route53.RecordTarget.fromAlias(
                new targets.CloudFrontTarget(this.distribution)
            ),
        });

        // Deploy the frontend
        new s3deploy.BucketDeployment(this, 'DeployFrontend', {
            sources: [
                s3deploy.Source.asset('./frontend/out') // Path to Next.js build output
            ],
            destinationBucket: this.bucket,
            distribution: this.distribution,
            distributionPaths: ['/*'],
            // Set environment variables for the build
            memoryLimit: 512,
            ephemeralStorageSize: cdk.Size.mebibytes(512),
        });

        // ========================================
        // OUTPUTS
        // ========================================

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: this.api.url,
            description: 'API Gateway endpoint'
        });

        new cdk.CfnOutput(this, 'DeploymentDomain', {
            value: `https://*.${deploymentDomain}`,
            description: 'Base domain for node deployments'
        });

        new cdk.CfnOutput(this, 'ExampleDeploymentURL', {
            value: `https://[deployment-id].${deploymentDomain}`,
            description: 'Example deployment URL pattern'
        });

        new cdk.CfnOutput(this, 'DeploymentsTableName', {
            value: deploymentsTable.tableName,
            description: 'DynamoDB deployments table name'
        });

        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `https://${domainName}`,
            description: 'Frontend Custom Domain URL'
        });

        // Output the CloudFront URL as backup
        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'Frontend CloudFront URL'
        });

        new cdk.CfnOutput(this, 'BucketName', {
            value: this.bucket.bucketName,
            description: 'Frontend S3 Bucket Name'
        });

        new cdk.CfnOutput(this, 'ECRRepositoryURI', {
            value: ecrRepository.repositoryUri,
            description: 'ECR repository URI'
        });

        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'ECS cluster name'
        });
    }

}