import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs'; 

export class MainStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

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

        // Output the CloudFront URL
        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'Frontend CloudFront URL'
        });

        new cdk.CfnOutput(this, 'BucketName', {
            value: this.bucket.bucketName,
            description: 'Frontend S3 Bucket Name'
        });

    }

}