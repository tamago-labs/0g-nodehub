"use client"

import React, { useState } from 'react';
import { Play, Settings, Trash2, X, Copy, CheckCircle, XCircle, Activity, Zap, Clock, Eye, ExternalLink, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  // Mock data for demonstration
  const nodes = [
    {
      id: 'node-001',
      deploymentId: 'dp-7f3a9b2c8e1d',
      nodeType: 'Inference Provider',
      aiModel: 'Llama 3.3 (llama-3.3-70b-instruct)',
      publicEndpoint: 'https://node-001.0gnodehub.com/api/v1/inference',
      status: 'active',
      uptime: '99.8%',
      requests24h: '1,247',
      earnings24h: '$12.47',
      createdAt: '2025-01-15',
      lastActivity: '2 minutes ago'
    },
    {
      id: 'node-002',
      deploymentId: 'dp-4c8d9a1b5f7e',
      nodeType: 'Inference Provider',
      aiModel: 'DeepSeek R1 (DeepSeek-R1)',
      publicEndpoint: 'https://node-002.0gnodehub.com/api/v1/inference',
      status: 'deploying',
      uptime: '-',
      requests24h: '-',
      earnings24h: '-',
      createdAt: '2025-01-21',
      lastActivity: 'Deploying...'
    },
    {
      id: 'node-003',
      deploymentId: 'dp-9e2f1a8c4b7d',
      nodeType: 'Inference Provider',
      aiModel: 'Llama 3.3 (llama-3.3-70b-instruct)',
      publicEndpoint: 'https://node-003.0gnodehub.com/api/v1/inference',
      status: 'error',
      uptime: '0%',
      requests24h: '0',
      earnings24h: '$0.00',
      createdAt: '2025-01-20',
      lastActivity: '5 hours ago'
    }
  ];

  const handleCopyEndpoint = (endpoint: any, nodeId: any) => {
    navigator.clipboard.writeText(endpoint);
    setCopiedEndpoint(nodeId);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const handlePlayground = (deploymentId: any) => {
    // Navigate to playground with deployment ID
    alert(`Navigating to playground with deployment ID: ${deploymentId}`);
  };

  const handleDeleteNode = (nodeId: any) => {
    setShowDeleteConfirm(false);
    setSelectedNode(null);
    alert(`Node ${nodeId} deletion initiated`);
  };

  const getStatusIcon = (status: any) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'deploying':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: any) => {
    const styles: any = {
      active: 'bg-green-100 text-green-800',
      deploying: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Manage and monitor your 0G network nodes</p>
          </div>
          <a href="/setup" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md">
            Create New Node
          </a>
        </div>
      </div>



      {/* Nodes List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Nodes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {nodes.map((node) => (
            <div key={node.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(node.status)}
                    <h3 className="text-lg font-medium text-gray-900">{node.deploymentId}</h3>
                    <span className={getStatusBadge(node.status)}>
                      {node.status.charAt(0).toUpperCase() + node.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Node Type</p>
                      <p className="font-medium text-gray-900">{node.nodeType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">AI Model</p>
                      <p className="font-medium text-gray-900">{node.aiModel.split(' (')[0]}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Requests (24h)</p>
                      <p className="font-medium text-gray-900">{node.requests24h}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 ml-6">
                  <button
                    onClick={() => handlePlayground(node.deploymentId)}
                    disabled={node.status !== 'active'}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${node.status === 'active'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>Playground</span>
                  </button>
                  <button
                    onClick={() => setSelectedNode(node)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Node Configuration</h3>
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
                      {selectedNode.status.charAt(0).toUpperCase() + selectedNode.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Public Endpoint</label>
                <div className="mt-1 flex items-center space-x-2">
                  <code className="flex-1 text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded">
                    {selectedNode.publicEndpoint}
                  </code>
                  <button
                    onClick={() => handleCopyEndpoint(selectedNode.publicEndpoint, selectedNode.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Node Type</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.nodeType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">AI Model</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.aiModel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.createdAt}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.lastActivity}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Uptime</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.uptime}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requests (24h)</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.requests24h}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Earnings (24h)</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNode.earnings24h}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Node</span>
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
                This action cannot be undone and will permanently remove all node data and stop all services.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  ⚠️ This will immediately terminate the node and stop earning rewards.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;