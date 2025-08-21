 
export interface DeploymentRequest {
  walletAddress: string;
  modelService: string;
  modelIdentifier: string;
  walletPrivateKey: string;
  verificationMethod?: string;
  domain?: string;
}

export interface DeploymentResponse {
  success: boolean;
  deploymentId: string;
  publicEndpoint: string;
  subdomain: string;
  status: string;
  message: string;
  error?: string;
}

export interface NodeDeployment {
  deploymentId: string;
  walletAddress: string;
  status: 'DEPLOYING' | 'DEPLOYED' | 'ACTIVE' | 'FAILED' | 'DELETING';
  modelService: string;
  modelIdentifier: string;
  verificationMethod: string;
  createdAt: string;
  updatedAt: string;
  subdomain: string;
  publicEndpoint: string;
  targetGroupArn?: string;
  serviceArn?: string;
  ruleArn?: string;
  securityGroupId?: string;
  errorMessage?: string;
}

export interface DeploymentsListResponse {
  success: boolean;
  deployments: NodeDeployment[];
  count: number;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try { 
      const response = await fetch(url, config);
 

      if (!response.ok) { 
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json(); 
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Create a new deployment
  async createDeployment(request: DeploymentRequest): Promise<DeploymentResponse> {
    return this.makeRequest<DeploymentResponse>('/deployments', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get deployments for a wallet
  async getDeployments(walletAddress: string): Promise<DeploymentsListResponse> {
    return this.makeRequest<DeploymentsListResponse>(
      `/deployments/${encodeURIComponent(walletAddress)}`
    );
  }

  // Get specific deployment details
  async getDeployment(
    walletAddress: string,
    deploymentId: string
  ): Promise<NodeDeployment> {
    return this.makeRequest<NodeDeployment>(
      `/deployments/${encodeURIComponent(walletAddress)}/${encodeURIComponent(deploymentId)}`
    );
  }

  // Delete a deployment
  async deleteDeployment(
    walletAddress: string,
    deploymentId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(
      `/deployments/${encodeURIComponent(walletAddress)}/${encodeURIComponent(deploymentId)}`,
      {
        method: 'DELETE',
      }
    );
  }
}

// Create API client instance
const apiClient = new ApiClient("https://kcjntn7inf.execute-api.ap-southeast-1.amazonaws.com/prod/");

// Export service functions
export const deploymentService = {
  // Create deployment with predefined values from test script
  async createNode(walletAddress: string, walletPrivateKey: string): Promise<DeploymentResponse> {
    const request: DeploymentRequest = {
      walletAddress,
      modelService: 'Llama 3.3',
      modelIdentifier: 'llama-3.3-70b-instruct',
      walletPrivateKey,
      verificationMethod: 'TeeML',
    };

    return apiClient.createDeployment(request);
  },

  // Get all deployments for wallet
  async getNodes(walletAddress: string): Promise<DeploymentsListResponse> {  
    return apiClient.getDeployments(walletAddress);
  },

  // Get specific deployment
  async getNode(walletAddress: string, deploymentId: string): Promise<NodeDeployment> {
    return apiClient.getDeployment(walletAddress, deploymentId);
  },

  // Delete deployment
  async deleteNode(walletAddress: string, deploymentId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.deleteDeployment(walletAddress, deploymentId);
  },
};

export default apiClient;
