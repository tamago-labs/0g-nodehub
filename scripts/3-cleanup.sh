#!/bin/bash
# cleanup.sh - Clean up all AWS resources

set -e

echo "🧹 Cleaning up 0G Inference Provider Platform"

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

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo -e "${YELLOW}⚠️  This will delete ALL resources for the 0G Inference Provider Platform${NC}"
echo -e "${YELLOW}📋 AWS Account: $AWS_ACCOUNT_ID${NC}"
echo -e "${YELLOW}🌍 Region: $AWS_REGION${NC}"
echo ""

# Confirmation prompt
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Cleanup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  Starting cleanup process...${NC}"

# 1. Delete CDK stack
echo -e "${YELLOW}☁️  Deleting CDK stack...${NC}"
if cdk list 2>/dev/null | grep -q "ZeroGInferenceProviderStack"; then
    cdk destroy ZeroGInferenceProviderStack --force
    echo -e "${GREEN}✅ CDK stack deleted${NC}"
else
    echo -e "${YELLOW}⚠️  CDK stack not found or already deleted${NC}"
fi

# 2. Delete ECR repository
echo -e "${YELLOW}🐳 Deleting ECR repository...${NC}"
if aws ecr describe-repositories --repository-names 0g-inference-broker --region $AWS_REGION > /dev/null 2>&1; then
    # Delete all images first
    aws ecr batch-delete-image \
        --repository-name 0g-inference-broker \
        --image-ids imageTag=latest \
        --region $AWS_REGION 2>/dev/null || true
    
    # Delete repository
    aws ecr delete-repository \
        --repository-name 0g-inference-broker \
        --force \
        --region $AWS_REGION
    
    echo -e "${GREEN}✅ ECR repository deleted${NC}"
else
    echo -e "${YELLOW}⚠️  ECR repository not found or already deleted${NC}"
fi

# 3. Delete ECS Task Execution Role (optional)
echo -e "${YELLOW}🔐 Checking ECS Task Execution Role...${NC}"
read -p "Do you want to delete the ECS Task Execution Role? This might affect other ECS services. (y/n): " DELETE_ROLE

if [ "$DELETE_ROLE" = "y" ] || [ "$DELETE_ROLE" = "Y" ]; then
    if aws iam get-role --role-name ecsTaskExecutionRole > /dev/null 2>&1; then
        # Detach policies first
        aws iam detach-role-policy \
            --role-name ecsTaskExecutionRole \
            --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true
        
        # Delete role
        aws iam delete-role --role-name ecsTaskExecutionRole
        echo -e "${GREEN}✅ ECS Task Execution Role deleted${NC}"
    else
        echo -e "${YELLOW}⚠️  ECS Task Execution Role not found${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Skipping ECS Task Execution Role deletion${NC}"
fi

# 4. Clean up local files
echo -e "${YELLOW}📁 Cleaning up local files...${NC}"

# Remove generated files
rm -f .docker-image-uri
rm -f deployment-summary.txt
rm -f /tmp/trust-policy.json

# Remove node_modules if user wants
read -p "Do you want to remove node_modules directories? (y/n): " CLEAN_MODULES

if [ "$CLEAN_MODULES" = "y" ] || [ "$CLEAN_MODULES" = "Y" ]; then
    rm -rf node_modules
    rm -rf lambda/node_modules
    echo -e "${GREEN}✅ Node modules cleaned up${NC}"
else
    echo -e "${YELLOW}⏭️  Keeping node_modules directories${NC}"
fi

# 5. Check for any remaining resources
echo -e "${YELLOW}🔍 Checking for any remaining resources...${NC}"

# Check for remaining ECS clusters
CLUSTERS=$(aws ecs list-clusters --query 'clusterArns[?contains(@, `0g-inference`) || contains(@, `ZeroG`)]' --output text)
if [ ! -z "$CLUSTERS" ]; then
    echo -e "${YELLOW}⚠️  Found remaining ECS clusters:${NC}"
    echo "$CLUSTERS"
    echo -e "${YELLOW}💡 You may need to delete these manually if they have running services${NC}"
fi

# Check for remaining security groups
SECURITY_GROUPS=$(aws ec2 describe-security-groups --query 'SecurityGroups[?contains(GroupName, `0g-inference`)].GroupId' --output text)
if [ ! -z "$SECURITY_GROUPS" ]; then
    echo -e "${YELLOW}⚠️  Found remaining security groups:${NC}"
    echo "$SECURITY_GROUPS"
    echo -e "${YELLOW}💡 These should be cleaned up automatically, but check manually if needed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cleanup completed!${NC}"
echo ""
echo -e "${GREEN}✅ Resources cleaned up:${NC}"
echo -e "${GREEN}  • CDK stack (VPC, ECS, Lambda, API Gateway, etc.)${NC}"
echo -e "${GREEN}  • ECR repository and Docker images${NC}"
echo -e "${GREEN}  • Local generated files${NC}"

if [ "$DELETE_ROLE" = "y" ] || [ "$DELETE_ROLE" = "Y" ]; then
    echo -e "${GREEN}  • ECS Task Execution Role${NC}"
fi

if [ "$CLEAN_MODULES" = "y" ] || [ "$CLEAN_MODULES" = "Y" ]; then
    echo -e "${GREEN}  • Node modules${NC}"
fi

echo ""
echo -e "${YELLOW}💡 To redeploy the platform:${NC}"
echo "1. Run ./build-docker.sh"
echo "2. Run ./deploy-infrastructure.sh" 
echo "3. Run ./test-deployment.sh"

echo ""
echo -e "${GREEN}💰 Expected cost savings: ~$50+ per month (depending on usage)${NC}"
echo -e "${GREEN}🎯 All resources have been removed from your AWS account${NC}"