"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Copy, CheckCircle, AlertCircle, Play, Zap, Clock } from 'lucide-react';

const Playground = () => {

    const [deploymentId, setDeploymentId] = useState('');
    const [nodeLoaded, setNodeLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<any>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [nodeInfo, setNodeInfo] = useState<any>(null);
    const messagesEndRef = useRef<any>(null);

    // Mock node data
    const mockNodes : any = {
        'dp-7f3a9b2c8e1d': {
            deploymentId: 'dp-7f3a9b2c8e1d',
            aiModel: 'Llama 3.3 (llama-3.3-70b-instruct)',
            status: 'active',
            endpoint: 'https://node-001.0gnodehub.com/api/v1/inference'
        },
        'dp-4c8d9a1b5f7e': {
            deploymentId: 'dp-4c8d9a1b5f7e',
            aiModel: 'DeepSeek R1 (DeepSeek-R1)',
            status: 'active',
            endpoint: 'https://node-002.0gnodehub.com/api/v1/inference'
        }
    };

    const loadNode = async () => {
        if (!deploymentId.trim()) return;

        setLoading(true);
        setMessages([]);

        // Simulate API call to load node
        setTimeout(() => {
            const node = mockNodes[deploymentId];
            if (node) {
                setNodeInfo(node);
                setNodeLoaded(true);
                setMessages([
                    {
                        id: 1,
                        type: 'system',
                        content: `Connected to ${node.aiModel}. You can now start chatting with your inference node.`,
                        timestamp: new Date()
                    }
                ]);
            } else {
                setMessages([
                    {
                        id: 1,
                        type: 'error',
                        content: `Node with deployment ID "${deploymentId}" not found or not accessible.`,
                        timestamp: new Date()
                    }
                ]);
                setNodeLoaded(false);
            }
            setLoading(false);
        }, 1500);
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
        setInputMessage('');
        setSending(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse = {
                id: Date.now() + 1,
                type: 'assistant',
                content: generateMockResponse(userMessage.content, nodeInfo?.aiModel),
                timestamp: new Date()
            };
            setMessages((prev: any) => [...prev, aiResponse]);
            setSending(false);
        }, Math.random() * 2000 + 1000);
    };

    const generateMockResponse = (userInput: any, model: any) => {
        const responses = {
            'Llama 3.3': [
                "I'm Llama 3.3, running on your 0G inference node. How can I help you today?",
                "That's an interesting question! Let me think about that...",
                "Based on my training, I can provide insights on a wide range of topics.",
                "I'm powered by Meta's latest language model architecture with 70B parameters."
            ],
            'DeepSeek R1': [
                "Hello! I'm DeepSeek R1, specialized in reasoning and mathematical tasks.",
                "I excel at logical reasoning and complex problem-solving. What would you like to explore?",
                "My reasoning capabilities allow me to break down complex problems step by step.",
                "I'm particularly strong in mathematics, coding, and analytical thinking."
            ]
        };

        const modelKey = model?.includes('Llama') ? 'Llama 3.3' : 'DeepSeek R1';
        const modelResponses = responses[modelKey] || responses['Llama 3.3'];

        if (userInput.toLowerCase().includes('hello') || userInput.toLowerCase().includes('hi')) {
            return modelResponses[0];
        }

        return modelResponses[Math.floor(Math.random() * modelResponses.length)];
    };

    const copyMessage = (content: any) => {
        navigator.clipboard.writeText(content);
    };

    const handleKeyPress = (e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-load from URL parameter (simulate)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paramDeploymentId = urlParams.get('deploymentId');
        if (paramDeploymentId) {
            setDeploymentId(paramDeploymentId);
        }
    }, []);

    return (
        <div className=" w-full max-w-7xl flex flex-col mx-auto px-4 sm:px-6 lg:px-8 py-8  ">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Playground</h1>
                <p className="text-gray-600">Test and interact with your inference nodes</p>
            </div>

            {/* Node Loader */}
            {!nodeLoaded && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Load Node</h2>
                    <div className="flex space-x-4">
                        <input
                            type="text"
                            value={deploymentId}
                            onChange={(e) => setDeploymentId(e.target.value)}
                            placeholder="Enter deployment ID (e.g., dp-7f3a9b2c8e1d)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            disabled={loading}
                        />
                        <button
                            onClick={loadNode}
                            disabled={loading || !deploymentId.trim()}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${loading || !deploymentId.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            <span>{loading ? 'Loading...' : 'Load Node'}</span>
                        </button>
                    </div>

                    {/* Quick Load Examples */}
                    <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">Quick load examples:</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setDeploymentId('dp-7f3a9b2c8e1d')}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                disabled={loading}
                            >
                                dp-7f3a9b2c8e1d (Llama 3.3)
                            </button>
                            <button
                                onClick={() => setDeploymentId('dp-4c8d9a1b5f7e')}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                disabled={loading}
                            >
                                dp-4c8d9a1b5f7e (DeepSeek R1)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Node Info Bar */}
            {nodeLoaded && nodeInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                                <p className="font-medium text-green-900">Connected to {nodeInfo.deploymentId}</p>
                                <p className="text-sm text-green-700">{nodeInfo.aiModel}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setNodeLoaded(false);
                                setNodeInfo(null);
                                setMessages([]);
                            }}
                            className="text-green-700 hover:text-green-900 text-sm font-medium"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Container */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 && nodeLoaded && (
                        <div className="text-center text-gray-500 py-8">
                            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Start a conversation with your inference node!</p>
                            <p className="text-sm mt-1">Type a message below to begin.</p>
                        </div>
                    )}

                    {messages.map((message: any) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : message.type === 'system'
                                            ? 'bg-gray-500 text-white'
                                            : message.type === 'error'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-purple-600 text-white'
                                    }`}>
                                    {message.type === 'user' ? (
                                        <User className="w-4 h-4" />
                                    ) : message.type === 'error' ? (
                                        <AlertCircle className="w-4 h-4" />
                                    ) : (
                                        <Bot className="w-4 h-4" />
                                    )}
                                </div>
                                <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                                    <div className={`inline-block px-4 py-2 rounded-lg ${message.type === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : message.type === 'system'
                                                ? 'bg-gray-100 text-gray-700'
                                                : message.type === 'error'
                                                    ? 'bg-red-50 text-red-800 border border-red-200'
                                                    : 'bg-gray-100 text-gray-900'
                                        }`}>
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <p className="text-xs text-gray-500">
                                            {message.timestamp.toLocaleTimeString()}
                                        </p>
                                        {message.type === 'assistant' && (
                                            <button
                                                onClick={() => copyMessage(message.content)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="flex justify-start">
                            <div className="flex space-x-3 max-w-3xl">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="inline-block px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {nodeLoaded && (
                    <div className="border-t border-gray-200 p-4">
                        <div className="flex space-x-4">
                            <textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message... (Press Enter to send)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                                // rows="1"
                                disabled={sending}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={sending || !inputMessage.trim()}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${sending || !inputMessage.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {sending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                <span>Send</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Playground;