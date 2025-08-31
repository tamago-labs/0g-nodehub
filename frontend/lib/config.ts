export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://p0m1nwx9bh.execute-api.ap-southeast-1.amazonaws.com/prod',
  },
  wallet: {
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo',
  },
  network: {
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '16601'),
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://evmrpc-testnet.0g.ai',
  },
  deployment: {
    // Default values from test script
    defaultModelService: 'Llama 3.3',
    defaultModelIdentifier: 'llama-3.3-70b-instruct',
    defaultVerificationMethod: 'TeeML',
  },
} as const;

export const validateConfig = () => {
  const requiredVars = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_RPC_URL',
  ];

  const missing = requiredVars.filter(
    varName => !process.env[varName]
  );

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables: ${missing.join(', ')}`
    );
  }

  return missing.length === 0;
};

// Error messages
export const errorMessages = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INVALID_WALLET_ADDRESS: 'Invalid wallet address format',
  PRIVATE_KEY_REQUIRED: 'Private key is required',
  API_ERROR: 'API request failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  DEPLOYMENT_FAILED: 'Deployment failed. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

// Success messages
export const successMessages = {
  DEPLOYMENT_CREATED: 'Node deployment initiated successfully!',
  DEPLOYMENT_DELETED: 'Node deleted successfully',
  WALLET_CONNECTED: 'Wallet connected successfully',
} as const;

// Deployment status mappings
export const statusConfig = {
  DEPLOYING: {
    label: 'Deploying',
    color: 'yellow',
    description: 'Your node is being deployed...',
  },
  DEPLOYED: {
    label: 'Deployed',
    color: 'blue',
    description: 'Node has been deployed successfully',
  },
  ACTIVE: {
    label: 'Active',
    color: 'green',
    description: 'Node is running and accepting requests',
  },
  FAILED: {
    label: 'Failed',
    color: 'red',
    description: 'Deployment failed',
  },
  DELETING: {
    label: 'Deleting',
    color: 'orange',
    description: 'Node is being deleted...',
  },
} as const;

export type DeploymentStatus = keyof typeof statusConfig;
