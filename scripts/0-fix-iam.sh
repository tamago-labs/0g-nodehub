#!/bin/bash
# fix-permissions.sh - Fix all IAM permissions for 0G inference platform

set -e

echo "🔧 Fixing All IAM Permissions for 0G Platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get AWS info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo -e "${GREEN}📋 AWS Account: $AWS_ACCOUNT_ID${NC}"
echo -e "${GREEN}🌍 AWS Region: $AWS_REGION${NC}"
echo ""

# =================================
# 1. Fix ECS Task Execution Role
# =================================
echo -e "${YELLOW}🔧 Step 1: Fixing ECS Task Execution Role...${NC}"

ROLE_NAME="ecsTaskExecutionRole"
POLICY_NAME="0g-additional-permissions"

# Check if role exists
if aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Role $ROLE_NAME exists${NC}"
    
    # Create additional policy document
    cat > /tmp/additional-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ],
            "Resource": "*"
        }
    ]
}
EOF

    # Delete old policy if exists
    aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" 2>/dev/null || true
    
    # Add the additional policy
    echo -e "${YELLOW}📋 Adding additional permissions...${NC}"
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/additional-policy.json
    
    echo -e "${GREEN}✅ Additional permissions added to ECS role${NC}"
else
    echo -e "${RED}❌ Role $ROLE_NAME not found. Run fix-iam-role.sh first.${NC}"
    exit 1
fi

# =================================
# 2. Fix Lambda Function Permissions
# =================================
echo ""
echo -e "${YELLOW}🔧 Step 2: Fixing Lambda Function Permissions...${NC}"

# Get Lambda function names from CDK stack
DEPLOYMENT_FUNCTION=""
MANAGEMENT_FUNCTION=""

STACK_NAME="CdkNodehubStack"

# Try to get function names from CloudFormation
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Found CDK stack: $STACK_NAME${NC}"
    
    # Get function names from stack resources
    FUNCTIONS=$(aws cloudformation list-stack-resources --stack-name "$STACK_NAME" --query 'StackResourceSummaries[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' --output text)
    
    for func in $FUNCTIONS; do
        if [[ $func == *"Deployment"* ]]; then
            DEPLOYMENT_FUNCTION="$func"
        elif [[ $func == *"Management"* ]]; then
            MANAGEMENT_FUNCTION="$func"
        fi
    done
    
    echo "Found functions:"
    echo "  Deployment: $DEPLOYMENT_FUNCTION"
    echo "  Management: $MANAGEMENT_FUNCTION"
    
else
    echo -e "${YELLOW}⚠️  CDK stack not found, trying to find functions by name pattern...${NC}"
    
    # Try to find functions by pattern
    ALL_FUNCTIONS=$(aws lambda list-functions --query 'Functions[].FunctionName' --output text)
    for func in $ALL_FUNCTIONS; do
        if [[ $func == *"Deployment"* && $func == *"0g"* ]]; then
            DEPLOYMENT_FUNCTION="$func"
        elif [[ $func == *"Management"* && $func == *"0g"* ]]; then
            MANAGEMENT_FUNCTION="$func"
        fi
    done
fi

# Fix deployment function permissions
if [ ! -z "$DEPLOYMENT_FUNCTION" ]; then
    echo -e "${YELLOW}🔧 Fixing deployment function permissions: $DEPLOYMENT_FUNCTION${NC}"
    
    ROLE_ARN=$(aws lambda get-function --function-name "$DEPLOYMENT_FUNCTION" --query 'Configuration.Role' --output text)
    ROLE_NAME=$(basename "$ROLE_ARN")
    
    cat > /tmp/deployment-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecs:*",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeSubnets", 
                "ec2:DescribeSecurityGroups",
                "ec2:CreateSecurityGroup",
                "ec2:DeleteSecurityGroup",
                "ec2:AuthorizeSecurityGroupIngress",
                "elasticloadbalancing:*",
                "route53:ChangeResourceRecordSets",
                "route53:GetHostedZone",
                "route53:ListResourceRecordSets",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "0g-deployment-permissions" \
        --policy-document file:///tmp/deployment-policy.json
    
    echo -e "${GREEN}✅ Deployment function permissions updated${NC}"
else
    echo -e "${YELLOW}⚠️  Deployment function not found${NC}"
fi

# Fix management function permissions  
if [ ! -z "$MANAGEMENT_FUNCTION" ]; then
    echo -e "${YELLOW}🔧 Fixing management function permissions: $MANAGEMENT_FUNCTION${NC}"
    
    ROLE_ARN=$(aws lambda get-function --function-name "$MANAGEMENT_FUNCTION" --query 'Configuration.Role' --output text)
    ROLE_NAME=$(basename "$ROLE_ARN")
    
    cat > /tmp/management-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecs:*",
                "ec2:DescribeSecurityGroups",
                "ec2:DeleteSecurityGroup",
                "elasticloadbalancing:*",
                "route53:ChangeResourceRecordSets",
                "logs:FilterLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "0g-management-permissions" \
        --policy-document file:///tmp/management-policy.json
    
    echo -e "${GREEN}✅ Management function permissions updated${NC}"
else
    echo -e "${YELLOW}⚠️  Management function not found${NC}"
fi

# =================================
# 3. Create CloudWatch Log Group
# =================================
echo ""
echo -e "${YELLOW}🔧 Step 3: Creating CloudWatch Log Group...${NC}"

LOG_GROUP_NAME="/ecs/0g-inference"

if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP_NAME" --query 'logGroups[?logGroupName==`'$LOG_GROUP_NAME'`]' --output text | grep -q "$LOG_GROUP_NAME"; then
    echo -e "${GREEN}✅ Log group $LOG_GROUP_NAME already exists${NC}"
else
    echo -e "${YELLOW}📋 Creating log group: $LOG_GROUP_NAME${NC}"
    aws logs create-log-group --log-group-name "$LOG_GROUP_NAME" --region "$AWS_REGION"
    echo -e "${GREEN}✅ Log group created${NC}"
fi

# =================================
# 4. Clean up temp files
# =================================
echo ""
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -f /tmp/additional-policy.json /tmp/deployment-policy.json /tmp/management-policy.json

echo ""
echo -e "${GREEN}🎉 All permissions fixed successfully!${NC}"
echo ""
echo -e "${GREEN}✅ Fixed:${NC}"
echo "  • ECS Task Execution Role permissions"
echo "  • Lambda Deployment function permissions"  
echo "  • Lambda Management function permissions"
echo "  • CloudWatch Log Group creation"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Test deployment: ./test-deployment.sh"
echo "2. If still issues, check CloudWatch logs for specific errors"
echo ""
echo -e "${GREEN}📋 Summary:${NC}"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "ECS Role: $ROLE_NAME"
echo "Log Group: $LOG_GROUP_NAME"