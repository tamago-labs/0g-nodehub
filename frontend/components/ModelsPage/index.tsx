"use client"

import React, { useState } from 'react';
import { Brain, Star, Users, Zap, ArrowRight, CheckCircle, Code, MessageCircle } from 'lucide-react';

const ModelsPage = () => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const models = [
    {
      id: 'llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B',
      shortName: 'Llama 3.3',
      description: 'Meta\'s most advanced large language model with 70B parameters',
      parameters: '70B',
      speed: 'Medium',
      accuracy: 'Excellent',
      pricing: {
        input: '$0.001',
        output: '$0.002',
        unit: 'per 1K tokens'
      },
      recommended: true,
      popular: true,
      icon: Brain,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      shortName: 'GPT-3.5',
      description: 'OpenAI\'s efficient and fast language model for high-volume applications',
      parameters: '175B',
      speed: 'Fast',
      accuracy: 'Good',
      pricing: {
        input: '$0.0005',
        output: '$0.0015',
        unit: 'per 1K tokens'
      },
      recommended: false,
      popular: true,
      icon: Zap,
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const getPerformanceColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400'; 
      case 'medium': return 'text-yellow-400';
      case 'fast': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const handleDeployModel = (modelId: string) => {
    // Could integrate with node setup modal or redirect to account portal
    console.log('Deploy with model:', modelId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Available AI Models</h1>
        <p className="text-gray-400">Choose from our selection of powerful AI models for your inference nodes</p>
      </div>

      {/* Models Grid - 2-3 cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {models.map((model) => {
          const Icon = model.icon;
          
          return (
            <div key={model.id} className="group bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-purple-500 rounded-xl overflow-hidden transition-all duration-200">
              {/* Model Card */}
              <div className="p-6">
                {/* Header */}
                {/*<div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${model.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    {model.recommended && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-600/30">
                        <Star className="w-3 h-3 mr-1" />
                        Recommended
                      </span>
                    )}
                    {model.popular && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-600/30">
                        <Users className="w-3 h-3 mr-1" />
                        Popular
                      </span>
                    )}
                  </div>
                </div>*/}

                {/* Title & Description */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">{model.name}</h3>
                  <code className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                    {model.id}
                  </code>
                  <p className="text-gray-300 text-sm mt-3 leading-relaxed">{model.description}</p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Parameters</div>
                    <div className="font-semibold text-white">{model.parameters}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Speed</div>
                    <div className={`font-semibold ${getPerformanceColor(model.speed)}`}>
                      {model.speed}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Accuracy</div>
                    <div className={`font-semibold ${getPerformanceColor(model.accuracy)}`}>
                      {model.accuracy}
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-gradient-to-br from-black to-gray-950 border border-gray-700 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Input:</span>
                    <span className="font-medium text-white">{model.pricing.input}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-400">Output:</span>
                    <span className="font-medium text-white">{model.pricing.output}</span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    {model.pricing.unit}
                  </div>
                </div>

                {/* Actions */}
                {/*<div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    {selectedModel === model.id ? 'Less Info' : 'More Info'}
                  </button>
                  <button
                    onClick={() => handleDeployModel(model.id)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Deploy
                  </button>
                </div>*/}

                {/* Expanded Details */}
                {selectedModel === model.id && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Key Capabilities</h4>
                      <div className="grid grid-cols-1 gap-1">
                        <div className="flex items-center text-xs text-gray-300">
                          <CheckCircle className="w-3 h-3 text-purple-400 mr-2" />
                          General conversation & Q&A
                        </div>
                        <div className="flex items-center text-xs text-gray-300">
                          <Code className="w-3 h-3 text-purple-400 mr-2" />
                          Code generation & debugging
                        </div>
                        <div className="flex items-center text-xs text-gray-300">
                          <MessageCircle className="w-3 h-3 text-purple-400 mr-2" />
                          {model.id.includes('llama') ? 'Advanced reasoning' : 'Fast processing'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Best For</h4>
                      <div className="text-xs text-gray-400">
                        {model.id.includes('llama') 
                          ? 'Complex tasks requiring deep reasoning and analysis'
                          : 'High-volume applications needing fast response times'
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Model Request Card */}
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-colors duration-200 group cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors duration-200">
            <span className="text-2xl">+</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Need Another Model?</h3>
          <p className="text-gray-400 text-sm mb-4">
            Request additional AI models for your specific use case
          </p>
          <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
            Request Model
          </button>
        </div>
      </div>
 
    </div>
  );
};

export default ModelsPage;
