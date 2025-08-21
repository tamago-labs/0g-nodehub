import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Define 0G Galileo testnet
export const galileoTestnet = defineChain({
  id: 16601,
  name: '0G Galileo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: '0G',
    symbol: '0G',
  },
  rpcUrls: {
    default: {
      http: ['https://divine-broken-paper.0g-galileo.quiknode.pro/096a09e4af44054340a9e1502630befe7fa9a828/'],
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: '0G NodeHub',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo',
  chains: [galileoTestnet],
  ssr: true,
});
