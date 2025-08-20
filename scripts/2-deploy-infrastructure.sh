#!/bin/bash
# deploy-infrastructure.sh - Deploy AWS infrastructure using CDK

set -e

echo "☁️  Deploying 0G Inference Provider Infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK not installed. Installing...${NC}"
    npm install -g aws-cdk
fi

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo -e "${GREEN}✅ Using AWS Account: $AWS_ACCOUNT_ID in region: $AWS_REGION${NC}"

# Check if CDK dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing CDK dependencies...${NC}"
    npm install
fi

# Install Lambda dependencies
echo -e "${YELLOW}📦 Installing Lambda dependencies...${NC}"
cd lambda
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# Check if Docker image has been built
if [ ! -f ".docker-image-uri" ]; then
    echo -e "${RED}❌ Docker image not found. Please run './build-docker.sh' first.${NC}"
    exit 1
fi

DOCKER_IMAGE_URI=$(cat .docker-image-uri)
echo -e "${GREEN}✅ Using Docker image: $DOCKER_IMAGE_URI${NC}"

# Create IAM role for ECS task execution if it doesn't exist
echo -e "${YELLOW}🔐 Setting up ECS Task Execution Role...${NC}"
if ! aws iam get-role --role-name ecsTaskExecutionRole > /dev/null 2>&1; then
    echo -e "${YELLOW}📋 Creating ECS Task Execution Role...${NC}"
    
    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create the role
    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document file:///tmp/trust-policy.json

    # Attach the managed policy
    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

    echo -e "${GREEN}✅ ECS Task Execution Role created${NC}"
else
    echo -e "${GREEN}✅ ECS Task Execution Role already exists${NC}"
fi

# Bootstrap CDK if needed
echo -e "${YELLOW}🏗️  Bootstrapping CDK...${NC}"
cdk bootstrap

# Deploy the infrastructure
echo -e "${YELLOW}🚀 Deploying infrastructure...${NC}"
cdk deploy --require-approval never

echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"

# Get the deployed values
echo -e "${YELLOW}📊 Retrieving deployment information...${NC}"
API_URL=$(aws cloudformation describe-stacks --stack-name MainStack --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text 2>/dev/null || echo "Not available")
DEPLOYMENT_DOMAIN=$(aws cloudformation describe-stacks --stack-name MainStack --query 'Stacks[0].Outputs[?OutputKey==`DeploymentDomain`].OutputValue' --output text 2>/dev/null || echo "deploy.0gnodehub.com")
ECR_URI=$(aws cloudformation describe-stacks --stack-name MainStack --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text 2>/dev/null || echo "Not available")
CLUSTER_NAME=$(aws cloudformation describe-stacks --stack-name MainStack --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' --output text 2>/dev/null || echo "Not available")

echo -e "${GREEN}🎉 Infrastructure deployment completed!${NC}"
echo ""
echo -e "${GREEN}📊 Deployment Summary:${NC}"
echo -e "${GREEN}🔗 API URL: $API_URL${NC}"
echo -e "${GREEN}🌐 Deployment Domain: $DEPLOYMENT_DOMAIN${NC}"
echo -e "${GREEN}🐳 ECR Repository: $ECR_URI${NC}"
echo -e "${GREEN}🖥️  ECS Cluster: $CLUSTER_NAME${NC}"
echo -e "${GREEN}🌍 AWS Region: $AWS_REGION${NC}"
echo -e "${GREEN}📋 AWS Account: $AWS_ACCOUNT_ID${NC}"

# Create a deployment summary file
cat > deployment-summary.txt << EOF
0G Inference Provider Platform - Infrastructure Deployment
=========================================================

API URL: $API_URL
Deployment Domain: $DEPLOYMENT_DOMAIN
ECR Repository: $ECR_URI
ECS Cluster: $CLUSTER_NAME
AWS Region: $AWS_REGION
AWS Account: $AWS_ACCOUNT_ID

Infrastructure deployed at: $(date)

Next Steps:
----------
1. Test the API endpoints
2. Deploy your first inference provider
3. Monitor deployments via CloudWatch

EOF

echo -e "${GREEN}📄 Deployment summary saved to deployment-summary.txt${NC}"
echo ""
echo -e "${YELLOW}💡 Next step: Run './test-deployment.sh' to test the platform${NC}"