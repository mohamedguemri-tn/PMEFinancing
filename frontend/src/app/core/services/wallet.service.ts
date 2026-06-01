import { Injectable } from '@angular/core';
import { BrowserProvider, formatEther, parseEther } from 'ethers';
import { environment } from '../../../environments/environment';

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

    await this.ensureCorrectNetwork();

    const accounts = await window.ethereum!.request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('No wallet accounts were returned.');
    }

    return String(accounts[0]).toLowerCase();
  }

  private async ensureCorrectNetwork(): Promise<void> {
    const chainId = environment.chainId;
    const chainIdHex = '0x' + chainId.toString(16);

    const isGanache = chainId === 1337;
    const networkName = isGanache ? 'Ganache Local' : 'Sepolia Testnet';
    const rpcUrl = environment.rpcUrl;

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (err: any) {
      if (err?.code === 4902) {
        // Network not in MetaMask yet — add it and switch
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: networkName,
            rpcUrls: [rpcUrl],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          }],
        });
      }
      // If user rejected or another error, let it propagate
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
