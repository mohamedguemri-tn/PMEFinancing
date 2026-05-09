import { Injectable } from '@angular/core';
import { BrowserProvider, parseEther } from 'ethers';

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

    const accounts = await window.ethereum!.request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('No wallet accounts were returned.');
    }

    return String(accounts[0]).toLowerCase();
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
