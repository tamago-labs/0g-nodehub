"use client"

import React, { useState } from 'react';
import { ChevronDown, Wallet, Menu, X, Diamond } from 'lucide-react';
import Link from "next/link"
import { usePathname } from "next/navigation"

const Header = () => {

    const path = usePathname()

    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleConnectWallet = () => {
        // Simulate wallet connection
        if (!isWalletConnected) {
            setIsWalletConnected(true);
            setWalletAddress('0x1234...5678');
        } else {
            setIsWalletConnected(false);
            setWalletAddress('');
        }
    };

    const navigation = [
        { name: 'Dashboard', href: '/', active: true },
        { name: 'Node Setup', href: '/setup', active: false },
         { name: 'Playground', href: '/playground', active: false }
    ];
 

    return (
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="https://www.0gnodehub.com" target="_blank" className="flex-shrink-0 flex items-center">
                            <span className="ml-3 font-mono text-xl font-semibold 
                       bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 
                       bg-clip-text text-transparent
                      
                       transition-all duration-700 ease-in-out
                        
                       cursor-pointer">
                                ◆ 0G NodeHub
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-8">
                        {navigation.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${item.href === path
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    {/* Connect Wallet Button */}
                    <div className="flex items-center">
                        {/* Desktop Wallet Button */}
                        <div className="hidden md:block">
                            {isWalletConnected ? (
                                <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-sm font-medium">{walletAddress}</span>
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectWallet}
                                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <span>Connect Wallet</span>
                                </button>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden ml-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 pt-4 pb-4">
                        <nav className="space-y-2">
                            {navigation.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${item.active
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.name}
                                </a>
                            ))}
                        </nav>

                        {/* Mobile Wallet Button */}
                        <div className="pt-4 border-t border-gray-200 mt-4">
                            {isWalletConnected ? (
                                <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-medium">{walletAddress}</span>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectWallet}
                                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                                >
                                    <Wallet className="w-4 h-4" />
                                    <span>Connect Wallet</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;