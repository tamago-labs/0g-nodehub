"use client"

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Server, Brain, Wallet, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { deploymentService } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAsync } from '@/lib/hooks';
import { validatePrivateKey } from '@/lib/utils';
import { config } from '@/lib/config';
import { useRouter } from 'next/navigation';

const NodeSetup = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNodeType, setSelectedNodeType] = useState('inference');
  const [selectedVersion, setSelectedVersion] = useState('v2.1');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b');
  const [walletAddress, setWalletAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Auto-populate wallet address when connected
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    }
  }, [isConnected, address]);

  // Deployment API call
  const { 
    data: deploymentResult, 
    loading: deploying, 
    error: deploymentError, 
    execute: createDeployment 
  } = useAsync(deploymentService.createNode);

  const steps = [
    { id: 1, title: 'Choose Node Type', icon: Server },
    { id: 2, title: 'Select AI Model', icon: Brain },
    { id: 3, title: 'Wallet Information', icon: Wallet }
  ];

  const nodeTypes = [
    {
      id: 'inference',
      name: 'Inference Provider Node',
      description: 'Transform your AI services into verifiable, revenue-generating endpoints on the 0G Compute Network. This guide covers setting up your service and connecting it through the provider broker.',
      versions: [
        { id: 'v2.0', name: 'Version 2.0', price: 'Free', specs: 'Stable version • Basic features' },
        { id: 'v2.1', name: 'Version 2.1', price: 'Free', specs: 'Latest version • Advanced features' }
      ],
      available: true
    },
    {
      id: 'finetuning',
      name: 'Fine-tuning Provider Node',
      description: 'Offer computing power for fine-tuning AI models on the 0G Compute Network. This guide provides a comprehensive walkthrough for setting up and offering computing power as a fine-tuning provider.',
      price: 'Free',
      specs: 'GPU-optimized instances • Model training support • Distributed computing',
      available: false
    },
    {
      id: 'validator',
      name: 'Validator Node',
      description: 'Secure the 0G network by validating transactions and maintaining consensus. Participate in network governance and earn validation rewards.',
      price: 'Free',
      specs: '99.9% uptime guarantee • Consensus participation • Network governance',
      available: false
    },
    {
      id: 'storage',
      name: 'Storage Node',
      description: 'Provide decentralized storage capacity to the 0G network. Store and serve data with high availability guarantees across the distributed network.',
      price: 'Free',
      specs: 'High availability storage • Data redundancy • Distributed file system',
      available: false
    },
    {
      id: 'data-availability',
      name: 'Data Availability Node',
      description: 'Ensure data availability across the 0G network. Maintain data integrity and accessibility for the ecosystem, providing crucial infrastructure for network reliability.',
      price: 'Free',
      specs: 'Data integrity verification • Network-wide availability • Redundancy management',
      available: false
    },
    {
      id: 'archival',
      name: 'Archival Node',
      description: 'Store complete blockchain history and provide historical data access. Essential for network transparency, auditability, and historical data queries.',
      price: 'Free',
      specs: 'Complete blockchain history • Historical data access • Long-term storage',
      available: false
    }
  ];

  const aiModels = [
    {
      id: 'llama-3.3-70b',
      name: 'Llama 3.3',
      fullName: 'llama-3.3-70b-instruct',
      description: 'Meta\'s latest large language model with 70B parameters',
      specs: '70B parameters • Instruction-tuned • Best for general tasks',
      recommended: true
    },
    {
      id: 'deepseek-r1',
      name: 'DeepSeek R1',
      fullName: 'DeepSeek-R1',
      description: 'Advanced reasoning model with strong mathematical capabilities',
      specs: 'Reasoning-focused • Strong in math & code • Latest release',
      recommended: false
    }
  ];

  const validateStep = (step: number): boolean => {
    const errors: {[key: string]: string} = {};
    
    switch (step) {
      case 1:
        if (!selectedNodeType) {
          errors.nodeType = 'Please select a node type';
        }
        if (selectedNodeType === 'inference' && !selectedVersion) {
          errors.version = 'Please select a version';
        }
        break;
      case 2:
        if (!selectedModel) {
          errors.model = 'Please select an AI model';
        }
        break;
      case 3:
        if (!walletAddress) {
          errors.walletAddress = 'Wallet address is required';
        }
        if (!privateKey) {
          errors.privateKey = 'Private key is required';
        } 
        // else if (!validatePrivateKey(privateKey)) {
        //   errors.privateKey = 'Invalid private key format';
        // }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedNodeType !== '' && (selectedNodeType !== 'inference' || selectedVersion !== '');
      case 2:
        return selectedModel !== '';
      case 3:
        // return walletAddress !== '' && privateKey !== '' && validatePrivateKey(privateKey);
        return walletAddress !== '' && privateKey !== ''
      default:
        return false;
    }
  };

  const handleDeploy = async () => {
    if (!validateStep(3)) {
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      await createDeployment(walletAddress, privateKey);
    } catch (error) {
      console.error('Deployment failed:', error);
      // Error handling is done in useEffect
    }
  };

  // Show success message when deployment completes
  useEffect(() => {
    if (deploymentResult && !deploying) {
      toast.success(
        `Deployment ${deploymentResult.deploymentId} created successfully!`
      );
      
      // Navigate to dashboard after successful deployment
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  }, [deploymentResult, deploying, router]); // Added router to deps

  // Show error message when deployment fails
  useEffect(() => {
    if (deploymentError) {
      toast.error(`Deployment failed: ${deploymentError}`);
    }
  }, [deploymentError]); // Removed toast from deps

  // Wallet connection warning
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Node</h1>
            <p className="text-gray-600">Deploy and manage your 0G network node in minutes</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Wallet Connection Required</h3>
            <p className="text-yellow-700 mb-4">
              Please connect your wallet to the 0G Galileo testnet to continue with node setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Node</h1>
        <p className="text-gray-600">Deploy and manage your 0G network node in minutes</p>
      </div>

      {/* Selected Options Summary - Show on Step 2+ */}
      {currentStep > 1 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-3">Configuration Summary</h3>
          <div className="space-y-2">
            {selectedNodeType && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-800">Node Type:</span>
                <span className="text-sm font-medium text-blue-900">
                  {nodeTypes.find(n => n.id === selectedNodeType)?.name}
                  {selectedVersion && ` (${nodeTypes.find(n => n.id === selectedNodeType)?.versions?.find(v => v.id === selectedVersion)?.name})`}
                </span>
              </div>
            )}
            {currentStep > 2 && selectedModel && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-800">AI Model:</span>
                <span className="text-sm font-medium text-blue-900">
                  {aiModels.find(m => m.id === selectedModel)?.name} ({aiModels.find(m => m.id === selectedModel)?.fullName})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {/* Step 1: Choose Node Type */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Node Type</h2>
            <div className="grid gap-4">
              {nodeTypes.map((nodeType) => (
                <div key={nodeType.id} className="relative">
                  <div 
                    className={`border rounded-lg p-4 transition-all ${
                      !nodeType.available 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                        : selectedNodeType === nodeType.id
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{nodeType.name}</h3>
                          {!nodeType.available && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Coming Soon
                            </span>
                          )}
                          {nodeType.available && selectedNodeType === nodeType.id && (
                            <CheckCircle className="ml-2 w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{nodeType.description}</p>
                        
                        {/* Version Selection for Available Nodes */}
                        {nodeType.available && nodeType.versions && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Select Version:</p>
                            {nodeType.versions.map((version) => (
                              <div
                                key={version.id}
                                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                  selectedNodeType === nodeType.id && selectedVersion === version.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  setSelectedNodeType(nodeType.id);
                                  setSelectedVersion(version.id);
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center">
                                      <span className="font-medium text-gray-900">{version.name}</span>
                                      {version.id === 'v2.1' && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          Latest
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{version.specs}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-semibold text-gray-900">{version.price}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Non-versioned nodes */}
                        {!nodeType.versions && (
                          <p className="text-sm text-gray-500 mt-2">{nodeType.specs}</p>
                        )}
                      </div>
                      
                      {/* Price for non-versioned nodes */}
                      {!nodeType.versions && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{nodeType.price}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select AI Model */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select AI Model</h2>
            <div className="grid gap-4">
              {aiModels.map((model) => (
                <div key={model.id} className="relative">
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{model.name}</h3>
                          <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                            {model.fullName}
                          </code>
                          {model.recommended && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Recommended
                            </span>
                          )}
                          {selectedModel === model.id && (
                            <CheckCircle className="ml-2 w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{model.description}</p>
                        <p className="text-sm text-gray-500 mt-2">{model.specs}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Wallet Information */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Information</h2>
            
            {/* Demo Warning */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  
                  <p className="text-sm text-yellow-700 mt-1">
                    This is for demonstration purposes. In production, wallet keys will be securely generated and stored in AWS Secrets Manager.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Wallet Address */}
              <div>
                <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  id="walletAddress"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x1234567890abcdef..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The wallet address that will receive node rewards
                </p>
              </div>

              {/* Private Key */}
              <div>
                <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key
                </label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? "text" : "password"}
                    id="privateKey"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter your private key..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPrivateKey ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div> 
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className={`flex items-center px-4 py-2 rounded-md font-medium ${
            currentStep === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        {currentStep < 3 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed() || deploying}
            className={`flex items-center px-6 py-2 rounded-md font-medium ${
              canProceed() && !deploying
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={handleDeploy}
            disabled={!canProceed() || deploying}
            className={`flex items-center px-6 py-2 rounded-md font-medium ${
              canProceed() && !deploying
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Server className="w-4 h-4 mr-2" />
                Deploy Node
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default NodeSetup;