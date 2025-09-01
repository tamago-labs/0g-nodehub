"use client"

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Wallet, Layers, ChevronDown, ArrowRight, Users, Activity, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { address, isConnected } = useAccount();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen relative">
      {/* Top Header with Connect Wallet */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/90 border-b border-gray-800">
        <div className="flex justify-between items-center px-8 py-4">
          <div>
          <h1 className="text-2xl font-bold text-white">Welcome</h1>
            <p className="text-gray-400 text-sm">Deploy & Manage 0G Network Nodes</p>
          </div>
          
          {/* Connect Wallet Button */}
          <div className="flex items-center">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="flex cursor-pointer items-center space-x-3 bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-black text-white px-6 py-3 rounded-xl font-medium border border-gray-700 hover:border-gray-600 transition-all duration-200 shadow-lg"
                          > 
                            <span>Connect Wallet</span>
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            className="flex items-center space-x-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
                          >
                            Wrong network
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center space-x-3">
                          <div 
                            className="flex items-center space-x-3 bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-black text-white px-4 py-3 rounded-xl cursor-pointer border border-gray-700 hover:border-gray-600 transition-all duration-200"
                            onClick={openAccountModal}
                          >
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">{formatAddress(account.address)}</span>
                            <ChevronDown className="w-4 h-4 opacity-70" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link href="/account" className="group">
              <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-gray-600 rounded-xl p-6 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-200" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Account Portal</h3>
                <p className="text-gray-400 text-sm">Manage your nodes and deployments</p>
              </div>
            </Link>

            <Link href="/models" className="group">
              <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-gray-600 rounded-xl p-6 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Models</h3>
                <p className="text-gray-400 text-sm">Browse available AI models</p>
              </div>
            </Link>

            <Link href="/playground" className="group">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-purple-500 rounded-xl p-6 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors duration-200" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Playground</h3>
                <p className="text-gray-400 text-sm">Test and experiment with models</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
