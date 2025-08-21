"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Settings, Trash2, X, Copy, CheckCircle, XCircle, Activity, Zap, Clock, Eye, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { deploymentService } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAsync, useDeployments } from '@/lib/hooks';
import { formatAddress, formatDate, formatDateTime, copyToClipboard, formatModelName, getStatusColor } from '@/lib/utils';
import { statusConfig } from '@/lib/config';
import type { NodeDeployment } from '@/lib/api';

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const [selectedNode, setSelectedNode] = useState<NodeDeployment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    loading: loadingNodes,
    error: nodesError,
    execute: fetchNodes
  } = useAsync(deploymentService.getNodes);

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
  },[address])

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
    // Navigate to playground with deployment ID
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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'deploying':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'deleting':
        return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusKey = status.toUpperCase() as keyof typeof statusConfig;
    const config = statusConfig[statusKey];
    
    if (!config) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }

    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      orange: 'bg-orange-100 text-orange-800',
    };

    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color as keyof typeof colorClasses] || colorClasses.green}`;
  };

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Manage and monitor your 0G network nodes</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Wallet Connection Required</h3>
            <p className="text-yellow-700 mb-4">
              Please connect your wallet to view your deployments and manage your nodes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Manage and monitor your 0G network nodes</p>
          </div>
          <Link href="/setup" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md">
            Create New Node
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {deploymentsLoading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-600">Loading your nodes...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {deploymentsError && !deploymentsLoading && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">Failed to Load Nodes</h3>
              <p className="text-sm text-red-700 mt-1">{deploymentsError}</p>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mb-4">
              <Activity className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Nodes Deployed</h3>
            <p className="text-gray-600 mb-4">
              You haven't deployed any nodes yet. Create your first node to get started.
            </p>
            <Link
              href="/setup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Deploy Your First Node
            </Link>
          </div>
        </div>
      )}

      {/* Nodes List */}
      {!deploymentsLoading && !deploymentsError && deployments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Nodes ({deployments.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {deployments.map((node) => (
              <div key={node.deploymentId} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(node.status)}
                      <h3 className="text-lg font-medium text-gray-900">{node.deploymentId}</h3>
                      <span className={getStatusBadge(node.status)}>
                        {statusConfig[node.status.toUpperCase() as keyof typeof statusConfig]?.label || node.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Model</p>
                        <p className="font-medium text-gray-900">{formatModelName(node.modelIdentifier)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium text-gray-900">{formatDate(node.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Verification</p>
                        <p className="font-medium text-gray-900">{node.verificationMethod}</p>
                      </div>
                    </div>

                    {/* Endpoint */}
                    {node.publicEndpoint && (
                      <div className="mt-3">
                        <p className="text-gray-500 text-sm mb-1">Public Endpoint</p>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded flex-1">
                            {node.publicEndpoint}
                          </code>
                          <button
                            onClick={() => handleCopyEndpoint(node.publicEndpoint, node.deploymentId)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Copy endpoint"
                          >
                            {copiedEndpoint === node.deploymentId ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={node.publicEndpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600 p-1"
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
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>Test</span>
                    </button>
                    <button
                      onClick={() => setSelectedNode(node)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
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

      {/* Configuration Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/10 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deployment ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded">
                    {selectedNode.deploymentId}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
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
                  <label className="block text-sm font-medium text-gray-700">Public Endpoint</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded">
                      {selectedNode.publicEndpoint}
                    </code>
                    <button
                      onClick={() => handleCopyEndpoint(selectedNode.publicEndpoint, selectedNode.deploymentId)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model Service</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.modelService}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">AI Model</label>
                  <p className="mt-1 text-sm text-gray-900">{formatModelName(selectedNode.modelIdentifier)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedNode.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedNode.updatedAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification Method</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.verificationMethod}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Wallet Address</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{formatAddress(selectedNode.walletAddress)}</p>
                </div>
              </div>

              {selectedNode.errorMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Error Message</label>
                  <p className="mt-1 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                    {selectedNode.errorMessage}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
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
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Delete Node</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete node <strong>{selectedNode.deploymentId}</strong>?
                This action cannot be undone and will permanently remove the node and stop all services.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  ⚠️ This will immediately terminate the node and all associated resources.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingNode}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
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

export default Dashboard;
