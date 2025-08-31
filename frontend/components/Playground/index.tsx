"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Copy, CheckCircle, AlertCircle, Play, Zap, Clock, ChevronDown, RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { deploymentService } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatModelName } from '@/lib/utils';

const Playground = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [availableNodes, setAvailableNodes] = useState<any[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<any>(null);

  // Load user's deployments when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      loadAvailableNodes();
    } else {
      setAvailableNodes([]);
      setSelectedNode(null);
      setSelectedNodeId('');
      setMessages([]);
    }
  }, [isConnected, address]);

  const loadAvailableNodes = async () => {
    if (!address) return;
    
    setLoadingNodes(true);
    try {
      const response = await deploymentService.getNodes(address);
      // Filter for active/deployed nodes only
      // const activeNodes = response.deployments?.filter(
      //   (node: any) => node.status.toLowerCase() === 'active' || node.status.toLowerCase() === 'deployed'
      // ) || [];
      setAvailableNodes(response.deployments);
    } catch (error) {
      console.error('Error loading nodes:', error);
      toast.error('Failed to load your nodes');
    } finally {
      setLoadingNodes(false);
    }
  };

  const handleNodeSelection = (nodeId: string) => {
    const node = availableNodes.find(n => n.deploymentId === nodeId);
    if (node) {
      setSelectedNodeId(nodeId);
      setSelectedNode(node);
      setMessages([{
        id: Date.now(),
        type: 'system',
        content: `Connected to ${formatModelName(node.modelIdentifier)} (${node.deploymentId}). You can now start chatting!`,
        timestamp: new Date()
      }]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending || !selectedNode) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      // Call the 0G Serving Broker API
      const response = await fetch(`${selectedNode.publicEndpoint}/v1/proxy/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // For now, we'll try without authentication headers
          // In production, these would need proper wallet signing
          // 'Address': address,
          // 'Fee': '1000',
          // 'Input-Fee': '100',
          // 'Nonce': '1',
          // 'Request-Hash': '0x...',
          // 'Signature': '...'
        },
        body: JSON.stringify({
          model: selectedNode.modelIdentifier,
          messages: [
            {
              role: 'user',
              content: inputMessage
            }
          ],
          stream: false
        })
      });

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

      setMessages(prev => [...prev, aiResponse]);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}. Note: This endpoint may require authentication headers for production use.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">AI Playground</h1>
            <p className="text-gray-400">Test and interact with your deployed inference nodes</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border border-yellow-600/30 rounded-xl p-8 max-w-md mx-auto">
             
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Wallet Connection Required</h3>
            <p className="text-yellow-200 mb-4">
              Please connect your wallet to access your deployed nodes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">AI Playground</h1>
        <p className="text-gray-400">Select one of your deployed nodes and start chatting</p>
      </div>

      {/* Node Selection */}
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Select Your Node</h2>
          <button
            onClick={loadAvailableNodes}
            disabled={loadingNodes}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingNodes ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingNodes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin mr-3" />
            <span className="text-gray-300">Loading your nodes...</span>
          </div>
        ) : availableNodes.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <Bot className="w-12 h-12 text-gray-600 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Active Nodes Found</h3>
            <p className="text-gray-400 mb-4">
              You need to deploy an active inference node first to use the playground.
            </p>
            <button
              onClick={() => window.location.href = '/account'}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-all duration-200"
            >
              Go to Account Portal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {availableNodes.map((node) => (
              <div
                key={node.deploymentId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedNodeId === node.deploymentId
                    ? 'border-purple-600 bg-purple-900/20 ring-2 ring-purple-500/20'
                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                }`}
                onClick={() => handleNodeSelection(node.deploymentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <h3 className="font-medium text-white">{node.deploymentId}</h3>
                      {selectedNodeId === node.deploymentId && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-600 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Model: </span>
                        <span className="text-white">{formatModelName(node.modelIdentifier)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status: </span>
                        <span className="text-green-400">{node.status}</span>
                      </div>
                    </div>
                    {node.publicEndpoint && (
                      <div className="mt-2">
                        <span className="text-gray-500 text-xs">Endpoint: </span>
                        <code className="text-xs text-gray-300">{node.publicEndpoint}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      {selectedNode ? (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl flex flex-col overflow-hidden" style={{ height: '600px' }}>
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-medium text-white">
                  {formatModelName(selectedNode.modelIdentifier)}
                </h3>
                <p className="text-sm text-gray-400">{selectedNode.deploymentId}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 sidebar-scroll">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <Bot className="w-16 h-16 mx-auto mb-6 text-gray-600 opacity-50" />
                <p className="text-lg text-white mb-2">Ready to chat!</p>
                <p className="text-sm">Your {formatModelName(selectedNode.modelIdentifier)} model is ready to respond.</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex space-x-4 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    message.type === 'user'
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
                    <div className={`inline-block px-4 py-3 rounded-xl max-w-full ${
                      message.type === 'user'
                        ? 'bg-purple-600 text-white'
                        : message.type === 'system'
                          ? 'bg-gray-800 text-gray-200 border border-gray-700'
                          : message.type === 'error'
                            ? 'bg-red-900/30 text-red-300 border border-red-600/30'
                            : 'bg-gray-800 text-white border border-gray-700'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.model && (
                        <p className="text-xs opacity-70 mt-2">Model: {message.model}</p>
                      )}
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
          <div className="border-t border-gray-800 p-6 bg-gray-900/50">
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
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  sending || !inputMessage.trim()
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
            
            {/* API Info */}
            <div className="mt-3 text-xs text-gray-500">
              <p>💡 Currently testing without authentication headers. Production use requires proper wallet signing.</p>
            </div>
          </div>
        </div>
      ) : (
        <div >
          
           
        </div>
      )}
    </div>
  );
};

export default Playground;
