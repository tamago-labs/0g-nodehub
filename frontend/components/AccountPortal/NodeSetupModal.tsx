"use client"

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Server, Brain, Settings, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { deploymentService } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAsync } from '@/lib/hooks';

interface NodeSetupModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NodeSetupModal: React.FC<NodeSetupModalProps> = ({ onClose, onSuccess }) => {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMode, setSelectedMode] = useState('MockTEE');
  const [selectedModel, setSelectedModel] = useState('');
  const [inputPrice, setInputPrice] = useState('0.001');
  const [outputPrice, setOutputPrice] = useState('0.002');
  const [walletAddress, setWalletAddress] = useState(address || '');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

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

  const modes = [
    {
      id: 'MockTEE',
      name: 'MockTEE',
      description: 'Mock Trusted Execution Environment for development and testing',
      available: true,
      badge: 'Available'
    },
    {
      id: 'PhalaTEE',
      name: 'PhalaTEE',
      description: 'Phala Network Trusted Execution Environment for production',
      available: false,
      badge: 'Coming Soon'
    }
  ];

  const models = [
    {
      id: 'llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      description: 'Meta\'s latest large language model with 70B parameters',
      specs: '70B parameters • Instruction-tuned • Best for general tasks',
      recommended: true
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'OpenAI\'s efficient and fast language model',
      specs: 'Fast inference • Cost-effective • Good for most applications',
      recommended: false
    }
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Info step, always can proceed
      case 2:
        return selectedMode !== '';
      case 3:
        return selectedModel !== '';
      case 4:
        return inputPrice !== '' && outputPrice !== '' && walletAddress !== '' && privateKey !== '';
      default:
        return false;
    }
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!walletAddress || !privateKey) {
      toast.error('Wallet address and private key are required');
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
      
      // Call onSuccess to refresh the deployments list
      onSuccess();
      
      // Close modal after successful deployment
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [deploymentResult, deploying]);

  // Show error message when deployment fails
  useEffect(() => {
    if (deploymentError) {
      toast.error(`Deployment failed: ${deploymentError}`);
    }
  }, [deploymentError]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-white">Create Inference Provider Node</h3>
            <p className="text-sm text-gray-400 mt-1">Step {currentStep} of 4</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-purple-600' : 'bg-gray-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: How To Guide */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">How to Deploy an Inference Provider Node</h2>
                <p className="text-gray-300 mb-6">
                  Follow these simple steps to deploy your AI inference node on the 0G network:
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Choose Mode</h3>
                    <p className="text-gray-400">
                      Select between MockTEE (development) or PhalaTEE (production) modes for your node verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Select AI Model</h3>
                    <p className="text-gray-400">
                      Choose from available AI models including Llama 3.3 70B and GPT-3.5 Turbo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Set Pricing</h3>
                    <p className="text-gray-400">
                      Configure your input and output token prices to monetize your AI services.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Deploy & Launch</h3>
                    <p className="text-gray-400">
                      Review your configuration and deploy your node to start earning from AI inference requests.
                    </p>
                  </div>
                </div>
              </div>
 
            </div>
          )}

          {/* Step 2: Choose Mode */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Choose Verification Mode</h2>
                <p className="text-gray-400">Select the trusted execution environment for your node.</p>
              </div>

              <div className="grid gap-4">
                {modes.map((mode) => (
                  <div key={mode.id} className="relative">
                    <div 
                      className={`border rounded-xl p-6 transition-all cursor-pointer ${
                        !mode.available 
                          ? 'border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-60' 
                          : selectedMode === mode.id
                            ? 'border-purple-600 bg-purple-900/20 ring-2 ring-purple-500/20'
                            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                      }`}
                      onClick={() => mode.available && setSelectedMode(mode.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-medium text-white">{mode.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              mode.available 
                                ? 'bg-green-900/30 text-green-300 border border-green-600/30'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                              {mode.badge}
                            </span>
                            {mode.available && selectedMode === mode.id && (
                              <CheckCircle className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <p className="text-gray-300">{mode.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Model */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Select AI Model</h2>
                <p className="text-gray-400">Choose the AI model that will power your inference node.</p>
              </div>

              <div className="grid gap-4">
                {models.map((model) => (
                  <div key={model.id} className="relative">
                    <div 
                      className={`border rounded-xl p-6 cursor-pointer transition-all ${
                        selectedModel === model.id
                          ? 'border-purple-600 bg-purple-900/20 ring-2 ring-purple-500/20'
                          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                      }`}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-medium text-white">{model.name}</h3>
                            <code className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-gray-300 border border-gray-700">
                              {model.id}
                            </code>
                            {model.recommended && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-600/30">
                                Recommended
                              </span>
                            )}
                            {selectedModel === model.id && (
                              <CheckCircle className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <p className="text-gray-300 mb-2">{model.description}</p>
                          <p className="text-sm text-gray-500">{model.specs}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Configuration & Pricing</h2>
                <p className="text-gray-400">Set your token prices and wallet information.</p>
              </div>

              {/* Configuration Summary */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4">
                <h3 className="font-medium text-white mb-3">Configuration Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Mode:</span>
                    <span className="text-sm font-medium text-white">{selectedMode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Model:</span>
                    <span className="text-sm font-medium text-white">
                      {models.find(m => m.id === selectedModel)?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Input Token Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={inputPrice}
                    onChange={(e) => setInputPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price per 1000 input tokens</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Output Token Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={outputPrice}
                    onChange={(e) => setOutputPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.002"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price per 1000 output tokens</p>
                </div>
              </div>

              {/* Wallet Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Wallet Information</h3>
                
                {/* Demo Warning */}
                <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border border-yellow-600/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-200">
                        This is for demonstration purposes. In production, wallet keys will be securely generated and stored.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0x1234567890abcdef..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Private Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPrivateKey ? "text" : "password"}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your private key..."
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={deploying}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed() || deploying}
                className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
                  canProceed() && !deploying
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={!canProceed() || deploying}
                className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
                  canProceed() && !deploying
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
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
      </div>
    </div>
  );
};

export default NodeSetupModal;
