"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Bot, User, Plus, Copy, CheckCircle, AlertCircle, Play, Zap, Clock, Key, Wallet, RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { deploymentService } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAsync, useDeployments } from '@/lib/hooks';
import { formatAddress, formatDate, formatModelName } from '@/lib/utils';
import { statusConfig } from '@/lib/config';
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const Playground = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [nodeLoaded, setNodeLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [nodeInfo, setNodeInfo] = useState<any>(null);
  const [useWalletSigning, setUseWalletSigning] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [showNodeSelector, setShowNodeSelector] = useState(true);
  const messagesEndRef = useRef<any>(null);

  // Default test private key for demo purposes
  const defaultPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

  // Deployments state management
  const {
    deployments,
    setDeployments,
    loading: deploymentsLoading,
    setLoading: setDeploymentsLoading,
    error: deploymentsError,
    setError: setDeploymentsError,
  } = useDeployments();

  // Load deployments when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      loadDeployments();
    } else {
      setDeployments([]);
    }
  }, [isConnected, address]);

  // Auto-load from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramDeploymentId = urlParams.get('deployment');
    if (paramDeploymentId && isConnected) {
      setSelectedNodeId(paramDeploymentId);
      loadNode(paramDeploymentId);
    }
  }, [isConnected]);

  const loadDeployments = useCallback(async () => {
    if (!address) return;
    
    setDeploymentsLoading(true);
    setDeploymentsError(null);
    
    try { 
      const response = await deploymentService.getNodes(address); 
      setDeployments(response.deployments || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load deployments';
      setDeploymentsError(errorMessage);
      toast.error('Failed to load your nodes');
    } finally {
      setDeploymentsLoading(false);
    }
  }, [address, toast, setDeployments, setDeploymentsLoading, setDeploymentsError]);

  const loadNode = async (deploymentId?: string) => {
    const nodeId = deploymentId || selectedNodeId;
    if (!nodeId.trim() || !isConnected || !address) return;

    setLoading(true);
    setMessages([]);

    try {
      const deployment = await deploymentService.getNode(address, nodeId);
      const nodeData = {
        deploymentId: deployment.deploymentId,
        aiModel: deployment.modelIdentifier,
        status: deployment.status,
        endpoint: deployment.publicEndpoint,
        modelService: deployment.modelService,
        createdAt: deployment.createdAt,
        verificationMethod: deployment.verificationMethod
      };

      setNodeInfo(nodeData);
      setNodeLoaded(true);
      setShowNodeSelector(false);
      setMessages([
        {
          id: 1,
          type: 'system',
          content: `Connected to ${formatModelName(nodeData.aiModel)} (${nodeData.deploymentId}). You can now start chatting with your inference node.`,
          timestamp: new Date()
        }
      ]);

    } catch (error) {
      console.error('Error loading node:', error);
      setMessages([
        {
          id: 1,
          type: 'error',
          content: `Failed to load node "${nodeId}". Please check the deployment ID and try again.`,
          timestamp: new Date()
        }
      ]);
      setNodeLoaded(false);
      toast.error('Failed to load node. Please check the deployment ID.');
    }

    setLoading(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending || !nodeLoaded) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages((prev: any) => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setSending(true);

    try {
      // Generate signature and headers for 0G network authentication
      // const signingKey = privateKey || defaultPrivateKey;
      // const timestamp = Date.now();
      // const nonce = Math.floor(Math.random() * 1000000);
      // const fee = '1000';
      // const inputFee = '100';
      
      // Create request hash for signing
      // const requestData = {
      //   model: nodeInfo.aiModel,
      //   message: currentMessage,
      //   timestamp,
      //   nonce,
      //   fee,
      //   inputFee
      // };
      // const requestHash = await generateRequestHash(requestData);
      // const signature = await generateSignature(requestHash, signingKey);

      const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
      const wallet = new ethers.Wallet(privateKey || defaultPrivateKey, provider);
      const broker = await createZGComputeNetworkBroker(wallet);

      console.log("broker:", broker, provider, currentMessage)

      // Generate auth headers
      // const headers = await broker.inference.getRequestHeaders(provider, currentMessage);

      // const headers = await broker.inference.getRequestHeaders("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", currentMessage);

      // console.log("headers:", headers)

      // FIXME: Fixing here

      // Call the 0G Serving Broker API
      const response = await fetch(`${nodeInfo.endpoint}/v1/proxy/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Address' : '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 
           'Fee': '1',
            'Input-Fee': '1',
           'Nonce': '1',
           'Request-Hash': '0x...',
           'Signature': '...'
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: 'user',
              content: currentMessage
            }
          ],
          stream: false
        })
      });

      console.log("response:", response)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.choices?.[0]?.message?.content || 'No response received',
        timestamp: new Date(),
        model: data.model,
        usage: data.usage
      };
      setMessages((prev: any) => [...prev, aiResponse]);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}. Note: This endpoint may require authentication headers for production use.`,
        timestamp: new Date()
      };
      setMessages((prev: any) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  // Generate request hash for 0G network authentication
  // const generateRequestHash = async (requestData: any): Promise<string> => {
  //   const payload = JSON.stringify(requestData);
  //   // Use browser's crypto API to generate hash
  //   const encoder = new TextEncoder();
  //   const data = encoder.encode(payload);
  //   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  //   const hashArray = new Uint8Array(hashBuffer);
  //   const hashHex = Array.from(hashArray)
  //     .map(b => b.toString(16).padStart(2, '0'))
  //     .join('');
  //   return '0x' + hashHex;
  // };

  // // Generate signature for authenticated requests using private key
  // const generateSignature = async (requestHash: string, privateKey: string): Promise<string> => {
  //   // For demo purposes, create a simple signature
  //   // In production, this would use proper ECDSA signing with the private key
  //   const timestamp = Date.now();
  //   const payload = `${requestHash}-${privateKey}-${timestamp}-${nodeInfo?.deploymentId || 'unknown'}`;
    
  //   // Use browser's crypto API to generate signature hash
  //   const encoder = new TextEncoder();
  //   const data = encoder.encode(payload);
  //   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  //   const hashArray = new Uint8Array(hashBuffer);
  //   const signatureHex = Array.from(hashArray)
  //     .map(b => b.toString(16).padStart(2, '0'))
  //     .join('');
    
  //   return '0x' + signatureHex.slice(0, 128); // Truncate to typical signature length
  // };

  const copyMessage = (content: any) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'deploying':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Zap className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAvailableNodes = () => {
    return deployments.filter(node => 
      node.status.toLowerCase() === 'active' || 
      node.status.toLowerCase() === 'deployed'
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show wallet connection requirement if not connected
  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">AI Model Playground</h1>
            <p className="text-gray-400">Test and interact with your deployed inference nodes</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 rounded-xl p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Wallet className="w-16 h-16 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Wallet Connection Required</h3>
            <p className="text-yellow-200 mb-6">
              Connect your wallet to access and test your deployed AI inference nodes on the 0G network.
            </p>
            <div className="space-y-3 text-sm text-yellow-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Access your deployed nodes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Test AI model responses</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Secure 0G network integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl flex flex-col mx-auto p-6">
      {/* Node Selector */}
      {showNodeSelector && (
        <div className="space-y-6 mb-6">
          {/* Available Nodes */}
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Select a Node to Test</h2>
              <button
                onClick={loadDeployments}
                disabled={deploymentsLoading}
                className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${deploymentsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {deploymentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-3" />
                <span className="text-gray-400">Loading your nodes...</span>
              </div>
            ) : deploymentsError ? (
              <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-600/30 rounded-xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to Load Nodes</h3>
                <p className="text-red-200 mb-4">{deploymentsError}</p>
                <button
                  onClick={loadDeployments}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : getAvailableNodes().length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-8 text-center">
                <Zap className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Active Nodes Found</h3>
                <p className="text-gray-400 mb-4">
                  You don't have any active inference nodes ready for testing.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Deploy a new node from the Account Portal to start testing AI models.
                </p>
                <a
                  href="/account"
                  className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Deploy a Node</span>
                </a>
              </div>
            ) : (
              <div className="grid gap-4">
                {getAvailableNodes().map((node) => (
                  <div 
                    key={node.deploymentId}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                      selectedNodeId === node.deploymentId
                        ? 'border-purple-600 bg-purple-900/20'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                    }`}
                    onClick={() => setSelectedNodeId(node.deploymentId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(node.status)}
                        <div>
                          <h3 className="font-medium text-white">{node.deploymentId}</h3>
                          <p className="text-sm text-gray-400">
                            {formatModelName(node.modelIdentifier)} • {node.verificationMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Created</div>
                        <div className="text-sm text-white">{formatDate(node.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Input */}
            {/* {getAvailableNodes().length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Or Enter Node ID Manually</h3>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={selectedNodeId}
                    onChange={(e) => setSelectedNodeId(e.target.value)}
                    placeholder="Enter deployment ID (e.g., dp-7f3a9b2c8e1d)"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )} */}
          </div>
 
          {false && getAvailableNodes().length > 0 && (
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6">
               <h3 className="text-lg font-semibold text-white mb-4">Signing Configuration</h3>
              
              <div className="space-y-4 mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useWalletSigning}
                    onChange={() => setUseWalletSigning(false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <Key className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">Private Key Signing (Recommended)</div>
                    <div className="text-gray-400 text-sm">Faster, simpler for testing. Uses hardcoded or custom private key.</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer opacity-75">
                  <input
                    type="radio"
                    checked={useWalletSigning}
                    onChange={() => setUseWalletSigning(true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <Wallet className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">Wallet Signing (Complex)</div>
                    <div className="text-gray-400 text-sm">Requires ZK proof generation. More secure but complex.</div>
                  </div>
                </label>
              </div> 
 
              {!useWalletSigning && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Private Key (Optional - uses default demo key if empty)
                  </label>
                  <input
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use demo private key</p>
                </div>
              )}
 
              <button
                onClick={() => loadNode()}
                disabled={loading || !selectedNodeId.trim()}
                className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${loading || !selectedNodeId.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25'
                  }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>{loading ? 'Connecting...' : 'Connect to Node'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      { !nodeLoaded && (
        <button
                onClick={() => loadNode()}
                disabled={loading || !selectedNodeId.trim()}
                className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${loading || !selectedNodeId.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25'
                  }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>{loading ? 'Connecting...' : 'Connect to Node'}</span>
              </button> )

      }

      {/* Connected Node Info */}
      {nodeLoaded && nodeInfo && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-green-300">Connected to {nodeInfo.deploymentId}</p>
                {/*<p className="text-sm text-green-200">
                  {formatModelName(nodeInfo.aiModel)} • {useWalletSigning ? 'Wallet Signing' : 'Private Key Signing'}
                </p>*/}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNodeSelector(true)}
                className="text-green-300 hover:text-green-100 text-sm font-medium px-3 py-1 rounded-lg hover:bg-green-800/20 transition-all duration-200"
              >
                Switch Node
              </button>
              <button
                onClick={() => {
                  setNodeLoaded(false);
                  setNodeInfo(null);
                  setMessages([]);
                  setShowNodeSelector(true);
                }}
                className="text-green-300 hover:text-green-100 text-sm font-medium px-3 py-1 rounded-lg hover:bg-green-800/20 transition-all duration-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      {nodeLoaded && (
        <div className="flex-1 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 sidebar-scroll">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <Bot className="w-16 h-16 mx-auto mb-6 text-gray-600 opacity-50" />
                <p className="text-lg text-white mb-2">Start a conversation with your inference node!</p>
                <p className="text-sm">Type a message below to begin testing your AI model on the 0G network.</p>
              </div>
            )}

            {messages.map((message: any) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex space-x-4 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${message.type === 'user'
                      ? 'bg-purple-600'
                      : message.type === 'system'
                        ? 'bg-gray-600'
                        : message.type === 'error'
                          ? 'bg-red-600'
                          : 'bg-gray-700'
                    }`}>
                    {message.type === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : message.type === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-4 py-3 rounded-xl max-w-full ${message.type === 'user'
                        ? 'bg-purple-600 text-white'
                        : message.type === 'system'
                          ? 'bg-gray-800 text-gray-200 border border-gray-700'
                          : message.type === 'error'
                            ? 'bg-red-900/30 text-red-300 border border-red-600/30'
                            : 'bg-gray-800 text-white border border-gray-700'
                      }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-2">
                      <p className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      {message.type === 'assistant' && (
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="text-gray-500 hover:text-gray-300 transition-colors duration-200"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex space-x-4 max-w-4xl">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700">
                      <div className="flex items-center space-x-3">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        <span>AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-800 p-6 bg-gradient-to-r from-gray-950 to-black">
            <div className="flex space-x-4">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send)"
                className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={1}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !inputMessage.trim()}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${sending || !inputMessage.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25'
                  }`}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playground;
