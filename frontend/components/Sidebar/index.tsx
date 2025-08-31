"use client"

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  User, 
  Layers, 
  Gamepad2, 
  BookOpen, 
  Diamond,
  ChevronRight,
  Zap
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const navigation = [ 
    { 
      name: 'Account Portal', 
      href: '/account', 
      icon: User,
      description: 'Manage your profile'
    },
    { 
      name: 'Models', 
      href: '/models', 
      icon: Layers,
      description: 'Browse AI models'
    },
    { 
      name: 'Playground', 
      href: '/playground', 
      icon: Zap,
      description: 'Test and experiment'
    }
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-black via-gray-950 to-black border-r border-gray-800 z-50">
      <div className="relative h-full flex flex-col">
        {/* Logo Section */}
       <div className="p-6   border-b border-gray-800">
  <Link href="/" className="flex items-center group">
     
     <img
        src="/logo.png"
        alt="0G NodeHub Logo"
        className="w-full  object-contain"
      />
  </Link>
</div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 sidebar-scroll overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${
                  active ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.name}</span>
                    {active && <ChevronRight className="w-4 h-4 opacity-70" />}
                  </div>
                  <p className={`text-xs mt-1 transition-opacity duration-200 ${
                    active ? 'text-purple-100' : 'text-gray-500 group-hover:text-gray-400'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav> 
      </div>
    </div>
  );
};

export default Sidebar;
