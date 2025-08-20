#!/bin/bash
# build-docker.sh - Build and push 0G inference broker Docker image

set -e

echo "🐳 Building 0G Inference Broker Docker Image"

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

echo -e "${GREEN}✅ Using AWS Account: $AWS_ACCOUNT_ID in region: $AWS_REGION${NC}"

# Create docker directory and files if they don't exist
echo -e "${YELLOW}📁 Setting up Docker configuration...${NC}"
mkdir -p docker

# Create Dockerfile if it doesn't exist
if [ ! -f "docker/Dockerfile" ]; then
cat > docker/Dockerfile << 'EOF'
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    tar \
    ca-certificates \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Download and install 0G inference broker from official releases
RUN wget https://github.com/0glabs/0g-serving-broker/releases/download/v0.2.1/inference-broker.tar.gz && \
    tar -xzf inference-broker.tar.gz && \
    rm inference-broker.tar.gz && \
    ls -la

# Copy configuration template and entrypoint
COPY config.template.yaml /app/config.template.yaml
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port 8080
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
EOF
echo -e "${GREEN}✅ Created Dockerfile${NC}"
fi

# Create config template if it doesn't exist
if [ ! -f "docker/config.template.yaml" ]; then
cat > docker/config.template.yaml << 'EOF'
# Based on 0G official configuration structure
servingUrl: "${SERVING_URL}"
privateKeys: "${PRIVATE_KEYS}"
targetUrl: "${TARGET_URL}"
model: "${MODEL}"

# Network configuration for 0G testnet
network:
  chainId: 16600
  rpcUrl: "https://evmrpc-testnet.0g.ai"

server:
  host: "0.0.0.0"
  port: 8080
  
logging:
  level: "info"
  format: "json"
  
health:
  enabled: true
  path: "/health"
  
verification:
  method: "${VERIFICATION_METHOD:-TeeML}"
  attestation:
    endpoint: "/attestation/report"
    enabled: true
  signature:
    endpoint: "/signature"
    enabled: true
    algorithm: "ECDSA"

settlement:
  enabled: true
  interval: "1h"
  gasLimit: 100000
EOF
echo -e "${GREEN}✅ Created config template${NC}"
fi

# Create entrypoint script if it doesn't exist
if [ ! -f "docker/entrypoint.sh" ]; then
cat > docker/entrypoint.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting 0G Inference Broker..."
echo "SERVING_URL: $SERVING_URL"
echo "TARGET_URL: $TARGET_URL"
echo "MODEL: $MODEL"

# Find the actual broker directory
BROKER_DIR=$(find /app -name "*.sh" -o -name "broker" -o -name "0g-*" -type f | head -1 | xargs dirname 2>/dev/null || echo "/app")
if [ -d "/app/inference-broker" ]; then
    BROKER_DIR="/app/inference-broker"
elif [ -d "/app/0g-serving-broker" ]; then
    BROKER_DIR="/app/0g-serving-broker"
fi

echo "📁 Using broker directory: $BROKER_DIR"
cd "$BROKER_DIR"

# Use official config if available, otherwise use template
if [ -f "config.example.yaml" ]; then
    cp config.example.yaml /tmp/config.base.yaml
else
    cp /app/config.template.yaml /tmp/config.base.yaml
fi

# Substitute environment variables
envsubst < /tmp/config.base.yaml > config.local.yaml

echo "📝 Generated configuration:"
cat config.local.yaml

# Wait for target service
echo "⏳ Waiting for target service at $TARGET_URL..."
for i in {1..30}; do
  if curl -f "$TARGET_URL/health" 2>/dev/null || curl -f "$TARGET_URL/" 2>/dev/null || curl -f "$TARGET_URL/v1/models" 2>/dev/null; then
    echo "✅ Target service is ready!"
    break
  fi
  echo "⏳ Target service not ready, waiting 10 seconds... ($i/30)"
  sleep 10
done

# Find broker executable
BROKER_EXECUTABLE=""
if [ -f "./broker" ]; then
    BROKER_EXECUTABLE="./broker"
elif [ -f "./0g-serving-broker" ]; then
    BROKER_EXECUTABLE="./0g-serving-broker"
elif [ -f "./inference-broker" ]; then
    BROKER_EXECUTABLE="./inference-broker"
elif [ -f "./main" ]; then
    BROKER_EXECUTABLE="./main"
else
    echo "❌ No broker executable found. Available files:"
    ls -la
    exit 1
fi

echo "🎯 Found broker executable: $BROKER_EXECUTABLE"
chmod +x "$BROKER_EXECUTABLE"

echo "🚀 Starting 0G inference broker..."
exec "$BROKER_EXECUTABLE" --config=config.local.yaml
EOF
    chmod +x docker/entrypoint.sh
    echo -e "${GREEN}✅ Created entrypoint script${NC}"
fi

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t 0g-inference-broker:latest docker/

# Create ECR repository if it doesn't exist
echo -e "${YELLOW}📦 Setting up ECR repository...${NC}"
REPO_URI=""
if aws ecr describe-repositories --repository-names 0g-inference-broker --region $AWS_REGION > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ECR repository already exists${NC}"
    REPO_URI=$(aws ecr describe-repositories --repository-names 0g-inference-broker --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)
else
    echo -e "${YELLOW}📦 Creating ECR repository...${NC}"
    REPO_URI=$(aws ecr create-repository --repository-name 0g-inference-broker --region $AWS_REGION --query 'repository.repositoryUri' --output text)
fi

# Login to ECR
echo -e "${YELLOW}🔐 Logging into ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push Docker image
echo -e "${YELLOW}📤 Pushing Docker image to ECR...${NC}"
docker tag 0g-inference-broker:latest $REPO_URI:latest
docker push $REPO_URI:latest

echo -e "${GREEN}✅ Docker image built and pushed successfully!${NC}"
echo -e "${GREEN}📦 Image URI: $REPO_URI:latest${NC}"

# Save the image URI for other scripts
echo "$REPO_URI:latest" > .docker-image-uri

echo -e "${YELLOW}💡 Next step: Run './deploy-infrastructure.sh' to deploy the platform${NC}"