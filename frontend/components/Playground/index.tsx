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
        <div className="w-full max-w-7xl flex flex-col mx-auto p-6">
            {/* Node Loader */}
            {!nodeLoaded && (
                <div className="bg-gradient-to-br from-black to-gray-950 border border-gray-800 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Load Node</h2>
                    <div className="flex space-x-4">
                        <input
                            type="text"
                            value={deploymentId}
                            onChange={(e) => setDeploymentId(e.target.value)}
                            placeholder="Enter deployment ID (e.g., dp-7f3a9b2c8e1d)"
                            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <button
                            onClick={loadNode}
                            disabled={loading || !deploymentId.trim()}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${loading || !deploymentId.trim()
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25'
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                            <span>{loading ? 'Loading...' : 'Load Node'}</span>
                        </button>
                    </div>

                    {/* Quick Load Examples */}
                    <div className="mt-6">
                        <p className="text-sm text-gray-400 mb-3">Quick load examples:</p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setDeploymentId('dp-7f3a9b2c8e1d')}
                                className="px-4 py-2 text-sm bg-gray-900 text-gray-300 rounded-lg hover:bg-gray-800 border border-gray-700 hover:border-purple-500 transition-all duration-200"
                                disabled={loading}
                            >
                                dp-7f3a9b2c8e1d (Llama 3.3)
                            </button>
                            <button
                                onClick={() => setDeploymentId('dp-4c8d9a1b5f7e')}
                                className="px-4 py-2 text-sm bg-gray-900 text-gray-300 rounded-lg hover:bg-gray-800 border border-gray-700 hover:border-purple-500 transition-all duration-200"
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
                <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <div>
                                <p className="font-medium text-green-300">Connected to {nodeInfo.deploymentId}</p>
                                <p className="text-sm text-green-200">{nodeInfo.aiModel}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setNodeLoaded(false);
                                setNodeInfo(null);
                                setMessages([]);
                            }}
                            className="text-green-300 hover:text-green-100 text-sm font-medium px-3 py-1 rounded-lg hover:bg-green-800/20 transition-all duration-200"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Container */}
            <div className="flex-1 bg-gradient-to-br from-black to-gray-950 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 sidebar-scroll">
                    {messages.length === 0 && nodeLoaded && (
                        <div className="text-center text-gray-500 py-12">
                            <Bot className="w-16 h-16 mx-auto mb-6 text-gray-600 opacity-50" />
                            <p className="text-lg text-white mb-2">Start a conversation with your inference node!</p>
                            <p className="text-sm">Type a message below to begin testing your AI model.</p>
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
                {nodeLoaded && (
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
                )}
            </div>
        </div>
    );
};

export default Playground;
