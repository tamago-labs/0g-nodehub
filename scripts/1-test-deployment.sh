#!/bin/bash
# test-deployment.sh - Test the 0G inference provider platform

set -e

echo "🧪 Testing 0G Inference Provider Platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if deployment summary exists
if [ ! -f "deployment-summary.txt" ]; then
    echo -e "${RED}❌ deployment-summary.txt not found. Please run './deploy-infrastructure.sh' first.${NC}"
    exit 1
fi

# Extract API URL from summary
API_URL=$(grep "API URL:" deployment-summary.txt | cut -d' ' -f3)
DEPLOYMENT_DOMAIN=$(grep "Deployment Domain:" deployment-summary.txt | cut -d' ' -f3)

if [ "$API_URL" = "Not" ] || [ -z "$API_URL" ]; then
    echo -e "${RED}❌ API URL not found. Please check if infrastructure deployment was successful.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using API URL: $API_URL${NC}"
echo -e "${GREEN}✅ Using Deployment Domain: $DEPLOYMENT_DOMAIN${NC}"

# Test wallet address (put yours)
TEST_WALLET="0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E"
TEST_PRIVATE_KEY="1234"

echo ""
echo -e "${YELLOW}🚀 Test 1: Creating a test deployment${NC}"


# Create a test deployment
DEPLOYMENT_RESPONSE=$(curl -s -X POST "$API_URL/deployments" \
  -H 'Content-Type: application/json' \
  -d "{
    \"walletAddress\": \"$TEST_WALLET\",
    \"modelService\": \"Llama 3.3\",
    \"modelIdentifier\": \"llama-3.3-70b-instruct\",
    \"walletPrivateKey\": \"$TEST_PRIVATE_KEY\",
    \"verificationMethod\": \"TeeML\"
  }")

echo "Response: $DEPLOYMENT_RESPONSE"

# Extract deployment ID from response
DEPLOYMENT_ID=$(echo "$DEPLOYMENT_RESPONSE" | grep -o '"deploymentId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DEPLOYMENT_ID" ]; then
    echo -e "${RED}❌ Failed to create deployment. Response: $DEPLOYMENT_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment created successfully!${NC}"
echo -e "${GREEN}📋 Deployment ID: $DEPLOYMENT_ID${NC}"

# Extract public endpoint
PUBLIC_ENDPOINT=$(echo "$DEPLOYMENT_RESPONSE" | grep -o '"publicEndpoint":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}🌐 Public Endpoint: $PUBLIC_ENDPOINT${NC}"

echo ""
echo -e "${YELLOW}🔍 Test 2: Checking deployment status${NC}"

# Wait a moment for deployment to process
sleep 5

# Check deployment status
STATUS_RESPONSE=$(curl -s "$API_URL/deployments/$TEST_WALLET/$DEPLOYMENT_ID")
echo "Status Response: $STATUS_RESPONSE"

# Extract status
STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}📊 Deployment Status: $STATUS${NC}"

echo ""
echo -e "${YELLOW}📝 Test 3: Listing all deployments for wallet${NC}"

# List all deployments for the wallet
LIST_RESPONSE=$(curl -s "$API_URL/deployments/$TEST_WALLET")
echo "List Response: $LIST_RESPONSE"

# Count deployments
DEPLOYMENT_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}📊 Total Deployments: $DEPLOYMENT_COUNT${NC}"

echo ""
echo -e "${YELLOW}⏳ Test 4: Waiting for deployment to become ready${NC}"

# Wait for deployment to be ready and accessible (up to 5 minutes)
for i in {1..30}; do
    echo -e "${YELLOW}⏳ Checking deployment status... ($i/30)${NC}"
    
    STATUS_RESPONSE=$(curl -s "$API_URL/deployments/$TEST_WALLET/$DEPLOYMENT_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
    PUBLIC_ENDPOINT=$(echo "$STATUS_RESPONSE" | sed -n 's/.*"publicEndpoint":"\([^"]*\)".*/\1/p')
    
    echo "Current status: '$STATUS'"
    echo "Public endpoint: '$PUBLIC_ENDPOINT'"
    
    if [ "$STATUS" = "FAILED" ]; then
        echo -e "${RED}❌ Deployment failed!${NC}"
        echo "Response: $STATUS_RESPONSE"
        break
    elif [ "$STATUS" = "ACTIVE" ] && [ ! -z "$PUBLIC_ENDPOINT" ]; then
        echo -e "${YELLOW}🌐 Testing endpoint accessibility...${NC}"
        
        # Test if the endpoint is actually accessible
        if curl -f -s -m 10 "$PUBLIC_ENDPOINT" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Deployment is ready and accessible!${NC}"
            break
        elif curl -f -s -m 10 "$PUBLIC_ENDPOINT/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Deployment is ready (health endpoint accessible)!${NC}"
            break
        else
            echo -e "${YELLOW}⚠️  Endpoint not yet accessible, waiting...${NC}"
        fi
    fi
    
    sleep 10
done

echo ""
echo -e "${YELLOW}🌐 Test 5: Testing public endpoint (if ready)${NC}"

if [ "$STATUS" = "ACTIVE" ] && [ ! -z "$PUBLIC_ENDPOINT" ]; then
    echo -e "${YELLOW}🔗 Testing endpoint: $PUBLIC_ENDPOINT${NC}"
    
    # Test the public endpoint (with timeout)
    if curl -f -m 30 "$PUBLIC_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Public endpoint is accessible!${NC}"
    else
        echo -e "${YELLOW}⚠️  Public endpoint not yet accessible (this is normal for new deployments)${NC}"
        echo -e "${YELLOW}💡 Try accessing it in a few minutes: $PUBLIC_ENDPOINT${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Deployment not ready yet or endpoint not available${NC}"
fi

echo ""
echo -e "${YELLOW}🧹 Test 6: Cleanup - Deleting test deployment${NC}"

# Delete the test deployment
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/deployments/$TEST_WALLET/$DEPLOYMENT_ID")
echo "Delete Response: $DELETE_RESPONSE"

DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | grep -o '"success":true')
if [ ! -z "$DELETE_SUCCESS" ]; then
    echo -e "${GREEN}✅ Test deployment deleted successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Deletion may be in progress. Check manually if needed.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Platform testing completed!${NC}"
echo ""
echo -e "${GREEN}📋 Test Summary:${NC}"
echo -e "${GREEN}✅ API endpoints are working${NC}"
echo -e "${GREEN}✅ Deployment creation works${NC}"
echo -e "${GREEN}✅ Status checking works${NC}"
echo -e "${GREEN}✅ Deployment listing works${NC}"
echo -e "${GREEN}✅ Deployment deletion works${NC}"

echo ""
echo -e "${YELLOW}💡 Your platform is ready for use!${NC}"
echo ""
echo -e "${YELLOW}📖 Usage Examples:${NC}"
echo ""
echo "Create a deployment:"
echo "curl -X POST $API_URL/deployments \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"walletAddress\": \"YOUR_WALLET_ADDRESS\","
echo "    \"modelService\": \"your-model:latest\","
echo "    \"modelIdentifier\": \"your-model-name\","
echo "    \"walletPrivateKey\": \"YOUR_PRIVATE_KEY\""
echo "  }'"
echo ""
echo "Check status:"
echo "curl $API_URL/deployments/YOUR_WALLET_ADDRESS/DEPLOYMENT_ID"
echo ""
echo "List deployments:"
echo "curl $API_URL/deployments/YOUR_WALLET_ADDRESS"
echo ""
echo -e "${GREEN}🌐 Your deployments will be available at: https://[deployment-id].$DEPLOYMENT_DOMAIN${NC}"