import { Injectable } from '@angular/core';
import { BrowserProvider, formatEther, parseEther } from 'ethers';

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  public async connectWallet(): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }

    await this.ensureGanacheNetwork();

    const accounts = await window.ethereum!.request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('No wallet accounts were returned.');
    }

    return String(accounts[0]).toLowerCase();
  }

  private async ensureGanacheNetwork(): Promise<void> {
    const GANACHE_CHAIN_ID = '0x539'; // 1337
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: GANACHE_CHAIN_ID }],
      });
    } catch (err: any) {
      if (err?.code === 4902) {
        // Network not added yet — add it and switch
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: GANACHE_CHAIN_ID,
            chainName: 'Ganache Local',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          }],
        });
      }
      // If another error (e.g. user rejected), let it propagate
    }
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }

    const provider = new BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    return signer.signMessage(message);
  }

  public isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  public async getBalance(address: string): Promise<string> {
    if (!this.isMetaMaskInstalled()) return '—';
    try {
      const provider = new BrowserProvider(window.ethereum as any);
      const raw = await provider.getBalance(address);
      return parseFloat(formatEther(raw)).toFixed(4);
    } catch {
      return '—';
    }
  }

  public async sendEth(to: string, amountEth: string): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed.');
    }
    const provider = new BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({ to, value: parseEther(amountEth) });
    return tx.hash;
  }
}
