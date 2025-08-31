"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Settings, Trash2, X, Copy, CheckCircle, XCircle, Activity, Zap, Clock, Eye, ExternalLink, AlertTriangle, Loader2, Plus } from 'lucide-react';
import { useAccount } from 'wagmi';
import { deploymentService } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAsync, useDeployments } from '@/lib/hooks';
import { formatAddress, formatDate, formatDateTime, copyToClipboard, formatModelName, getStatusColor } from '@/lib/utils';
import { statusConfig } from '@/lib/config';
import type { NodeDeployment } from '@/lib/api';
import NodeSetupModal from './NodeSetupModal';

const AccountPortal = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const [selectedNode, setSelectedNode] = useState<NodeDeployment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNodeSetup, setShowNodeSetup] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  
  // Deployments state management
  const {
    deployments,
    setDeployments,
    loading: deploymentsLoading,
    setLoading: setDeploymentsLoading,
    error: deploymentsError,
    setError: setDeploymentsError,
    updateDeployment,
    removeDeployment,
  } = useDeployments();

  // API calls
  const {
    loading: deletingNode,
    error: deleteError,
    execute: deleteNode
  } = useAsync(deploymentService.deleteNode);

  // Load deployments when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      loadDeployments();
    } else {
      setDeployments([]);
    }
  }, [isConnected, address]);

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

  const handleCopyEndpoint = async (endpoint: string, nodeId: string) => {
    const success = await copyToClipboard(endpoint);
    if (success) {
      setCopiedEndpoint(nodeId);
      toast.success('Endpoint copied to clipboard');
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } else {
      toast.error('Failed to copy endpoint');
    }
  };

  const handlePlayground = (deploymentId: string) => {
    window.open(`/playground?deployment=${deploymentId}`, '_blank');
  };

  const handleDeleteNode = async (node: NodeDeployment) => {
    if (!address) return;
    
    try {
      const response = await deploymentService.deleteNode(address, node.deploymentId); 
      removeDeployment(node.deploymentId);
      toast.success('Node deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedNode(null); 
    } catch (error) {
      toast.error('Failed to delete node');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'deployed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'deploying':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'deleting':
        return <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusKey = status.toUpperCase() as keyof typeof statusConfig;
    const config = statusConfig[statusKey];
    
    if (!config) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300';
    }

    const colorClasses = {
      green: 'bg-green-900/30 text-green-300 border border-green-600/30',
      yellow: 'bg-yellow-900/30 text-yellow-300 border border-yellow-600/30',
      red: 'bg-red-900/30 text-red-300 border border-red-600/30',
      blue: 'bg-blue-900/30 text-blue-300 border border-blue-600/30',
      orange: 'bg-orange-900/30 text-orange-300 border border-orange-600/30',
    };

    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color as keyof typeof colorClasses] || colorClasses.green}`;
  };

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Account Portal</h1>
            <p className="text-gray-400">Manage and monitor your 0G network nodes</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border border-yellow-600/30 rounded-xl p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Wallet Connection Required</h3>
            <p className="text-yellow-200 mb-4">
              Please connect your wallet to view your deployments and manage your nodes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Account Portal</h1>
            <p className="text-gray-400">Manage and monitor your 0G network nodes</p>
          </div>
          <button
            onClick={() => setShowNodeSetup(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Node</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {deploymentsLoading && (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mr-3" />
            <span className="text-gray-300">Loading your nodes...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {deploymentsError && !deploymentsLoading && (
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-600/30 rounded-xl p-6">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="font-medium text-red-300">Failed to Load Nodes</h3>
              <p className="text-sm text-red-200 mt-1">{deploymentsError}</p>
            </div>
          </div>
          <button
            onClick={loadDeployments}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!deploymentsLoading && !deploymentsError && deployments.length === 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-8">
          <div className="text-center">
            <div className="mb-4">
              <Activity className="w-12 h-12 text-gray-600 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Nodes Deployed</h3>
            <p className="text-gray-400 mb-4">
              You haven't deployed any nodes yet. Create your first node to get started.
            </p>
            <button
              onClick={() => setShowNodeSetup(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
            >
              Deploy Your First Node
            </button>
          </div>
        </div>
      )}

      {/* Nodes List */}
      {!deploymentsLoading && !deploymentsError && deployments.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              Your Nodes ({deployments.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-800">
            {deployments.map((node) => (
              <div key={node.deploymentId} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(node.status)}
                      <h3 className="text-lg font-medium text-white">{node.deploymentId}</h3>
                      <span className={getStatusBadge(node.status)}>
                        {statusConfig[node.status.toUpperCase() as keyof typeof statusConfig]?.label || node.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Model</p>
                        <p className="font-medium text-white">{formatModelName(node.modelIdentifier)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium text-white">{formatDate(node.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Verification</p>
                        <p className="font-medium text-white">{node.verificationMethod}</p>
                      </div>
                    </div>

                    {/* Endpoint */}
                    {node.publicEndpoint && (
                      <div className="mt-3">
                        <p className="text-gray-500 text-sm mb-1">Public Endpoint</p>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm text-white bg-gray-800 px-2 py-1 rounded flex-1 border border-gray-700">
                            {node.publicEndpoint}
                          </code>
                          <button
                            onClick={() => handleCopyEndpoint(node.publicEndpoint, node.deploymentId)}
                            className="text-gray-400 hover:text-gray-300 p-1"
                            title="Copy endpoint"
                          >
                            {copiedEndpoint === node.deploymentId ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={node.publicEndpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-300 p-1"
                            title="Open endpoint"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => handlePlayground(node.deploymentId)}
                      disabled={node.status.toLowerCase() !== 'active' && node.status.toLowerCase() !== 'deployed'}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        node.status.toLowerCase() === 'active' || node.status.toLowerCase() === 'deployed'
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>Test</span>
                    </button>
                    <button
                      onClick={() => setSelectedNode(node)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Manage</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Node Setup Modal */}
      {showNodeSetup && (
        <NodeSetupModal 
          onClose={() => setShowNodeSetup(false)} 
          onSuccess={loadDeployments} 
        />
      )}

      {/* Configuration Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Deployment ID</label>
                  <p className="mt-1 text-sm text-white font-mono bg-gray-800 px-3 py-2 rounded border border-gray-700">
                    {selectedNode.deploymentId}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Status</label>
                  <div className="mt-1 flex items-center space-x-2">
                    {getStatusIcon(selectedNode.status)}
                    <span className={getStatusBadge(selectedNode.status)}>
                      {statusConfig[selectedNode.status.toUpperCase() as keyof typeof statusConfig]?.label || selectedNode.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedNode.publicEndpoint && (
                <div>
                  <label className="block text-sm font-medium text-gray-400">Public Endpoint</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 text-sm text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                      {selectedNode.publicEndpoint}
                    </code>
                    <button
                      onClick={() => handleCopyEndpoint(selectedNode.publicEndpoint, selectedNode.deploymentId)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Model Service</label>
                  <p className="mt-1 text-sm text-white">{selectedNode.modelService}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">AI Model</label>
                  <p className="mt-1 text-sm text-white">{formatModelName(selectedNode.modelIdentifier)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Created</label>
                  <p className="mt-1 text-sm text-white">{formatDateTime(selectedNode.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Last Updated</label>
                  <p className="mt-1 text-sm text-white">{formatDateTime(selectedNode.updatedAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Verification Method</label>
                  <p className="mt-1 text-sm text-white">{selectedNode.verificationMethod}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Wallet Address</label>
                  <p className="mt-1 text-sm text-white font-mono">{formatAddress(selectedNode.walletAddress)}</p>
                </div>
              </div>

              {selectedNode.errorMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-400">Error Message</label>
                  <p className="mt-1 text-sm text-red-300 bg-red-900/20 px-3 py-2 rounded border border-red-600/30">
                    {selectedNode.errorMessage}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletingNode}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingNode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{deletingNode ? 'Deleting...' : 'Delete Node'}</span>
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Delete Node</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete node <strong className="text-white">{selectedNode.deploymentId}</strong>?
                This action cannot be undone and will permanently remove the node and stop all services.
              </p>
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">
                  ⚠️ This will immediately terminate the node and all associated resources.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingNode}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNode)}
                disabled={deletingNode}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingNode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{deletingNode ? 'Deleting...' : 'Delete Node'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPortal;
