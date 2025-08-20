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

        // Output the custom domain URL
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