import React from 'react';
import { ExternalLink, Twitter, Github, MessageCircle } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200/50 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-8">
                    {/* Main Footer Content */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Company Info */}
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center mb-4">
                                
                                <span className="  text-xl font-mono font-semibold text-gray-900">
                                    ◆ 0G NodeHub
                                </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4 max-w-md">
                            Managed node infrastructure for the 0G ecosystem. Deploy and manage your AI blockchain nodes with ease.
                            </p>
                            <div className="flex items-center text-sm text-gray-500">
                                <span>Operated by</span>
                                <span className="ml-2 font-medium text-gray-900">Tamago Labs Japan</span>
                            </div>
                        </div>

                        {/* Quick Links */}
                        {/* <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                                Platform
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        Dashboard
                                    </a>
                                </li>
                                <li>
                                    <a href="/setup" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        Node Setup
                                    </a>
                                </li>
                                <li>
                                    <a href="/management" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        Node Management
                                    </a>
                                </li>
                                <li>
                                    <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        Pricing
                                    </a>
                                </li>
                            </ul>
                        </div> */}

                        {/* Resources */}
                        {/* <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                                Resources
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <a
                                        href="https://docs.0g.ai"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center"
                                    >
                                        0G Documentation
                                        <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </li>
                                <li>
                                    <a href="/docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        Setup Guides
                                    </a>
                                </li>
                                <li>
                                    <a href="/support" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        Support
                                    </a>
                                </li>
                                <li>
                                    <a href="/status" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                        System Status
                                    </a>
                                </li>
                            </ul>
                        </div> */}
                    </div>

                    {/* Bottom Section */}
                    <div className="mt-8 pt-6 border-t border-gray-200/50">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            {/* Copyright */}
                            <div className="text-sm text-gray-500 mb-4 md:mb-0">
                                © {currentYear} Tamago Labs Japan. All rights reserved.
                            </div>

                            {/* Social Links & Legal */}
                            <div className="flex items-center space-x-6">
                                {/* Social Links */}
                                <div className="flex items-center space-x-4">
                                    <a
                                        href="https://twitter.com/0gnodehub"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                    <a
                                        href="https://github.com/tamago-labs"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <Github className="w-5 h-5" />
                                    </a>
                                    <a
                                        href="https://discord.gg/0gnodehub"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </a>
                                </div>

                                {/* Legal Links */}
                                <div className="hidden md:flex items-center space-x-4 text-sm">
                                    <a href="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
                                        Privacy Policy
                                    </a>
                                    <a href="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
                                        Terms of Service
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Legal Links */}
                        <div className="md:hidden flex justify-center space-x-4 mt-4 text-sm">
                            <a href="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
                                Privacy Policy
                            </a>
                            <span className="text-gray-300">•</span>
                            <a href="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
                                Terms of Service
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;