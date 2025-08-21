export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatUptime = (uptime: number): string => {
  if (uptime >= 99.9) return '99.9%';
  if (uptime >= 99) return `${uptime.toFixed(1)}%`;
  return `${uptime.toFixed(2)}%`;
};

export const validatePrivateKey = (privateKey: string): boolean => {
  // Basic validation for Ethereum private key format
  const cleanKey = privateKey.replace('0x', '');
  return /^[a-fA-F0-9]{64}$/.test(cleanKey);
};

export const validateWalletAddress = (address: string): boolean => {
  // Basic validation for Ethereum address format
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const generateDeploymentUrl = (deploymentId: string): string => {
  return `https://${deploymentId}.deploy.0gnodehub.com`;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const formatModelName = (modelIdentifier: string): string => {
  // Convert model identifier to display name
  switch (modelIdentifier) {
    case 'llama-3.3-70b-instruct':
      return 'Llama 3.3';
    case 'DeepSeek-R1':
      return 'DeepSeek R1';
    default:
      return modelIdentifier;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'deployed':
      return 'green';
    case 'deploying':
      return 'yellow';
    case 'failed':
      return 'red';
    case 'deleting':
      return 'orange';
    default:
      return 'gray';
  }
};

export const parseApiError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'An unexpected error occurred';
};
