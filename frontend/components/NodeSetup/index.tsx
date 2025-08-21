"use client"

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Server, Brain, Wallet, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

const NodeSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNodeType, setSelectedNodeType] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const steps = [
    { id: 1, title: 'Choose Node Type', icon: Server },
    { id: 2, title: 'Select AI Model', icon: Brain },
    { id: 3, title: 'Wallet Information', icon: Wallet }
  ];

  const nodeTypes = [
    {
      id: 'inference',
      name: 'Inference Provider Node',
      description: 'Transform your AI services into verifiable, revenue-generating endpoints',
      price: '$29/month',
      specs: 'Up to 1000 requests/day',
      available: true
    },
    {
      id: 'finetuning',
      name: 'Fine-tuning Provider Node',
      description: 'Offer computing power for fine-tuning AI models on the network',
      price: '$49/month',
      specs: 'GPU-optimized instances',
      available: false
    },
    {
      id: 'validator',
      name: 'Validator Node',
      description: 'Validate transactions and secure the 0G network',
      price: '$39/month',
      specs: '99.9% uptime guarantee',
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

  const handleNext = () => {
    if (currentStep < 3) {
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
        return selectedNodeType !== '';
      case 2:
        return selectedModel !== '';
      case 3:
        return walletAddress !== '' && privateKey !== '';
      default:
        return false;
    }
  };

  const handleDeploy = () => {
    alert('Node deployment initiated! (Demo functionality)');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      !nodeType.available 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                        : selectedNodeType === nodeType.id
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => nodeType.available && setSelectedNodeType(nodeType.id)}
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
                        <p className="text-sm text-gray-500 mt-2">{nodeType.specs}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{nodeType.price}</p>
                      </div>
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
                  <h4 className="font-medium text-yellow-800">Demo Mode</h4>
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
                <div className="flex items-center mt-2">
                  <Lock className="w-3 h-3 text-gray-400 mr-1" />
                  <p className="text-xs text-gray-500">
                    Your private key is encrypted and stored securely
                  </p>
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
            disabled={!canProceed()}
            className={`flex items-center px-6 py-2 rounded-md font-medium ${
              canProceed()
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
            disabled={!canProceed()}
            className={`flex items-center px-6 py-2 rounded-md font-medium ${
              canProceed()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Server className="w-4 h-4 mr-2" />
            Deploy Node
          </button>
        )}
      </div>
    </div>
  );
};

export default NodeSetup;