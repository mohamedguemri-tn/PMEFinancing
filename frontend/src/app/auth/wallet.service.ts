import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { BrowserProvider } from 'ethers';
import { environment } from '../../environments/environment';
import { CurrentUser } from './auth.models';

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly tokenKey = 'auth_token';
  private readonly currentUserSubject = new BehaviorSubject<CurrentUser | null>(this.loadStoredUser());
  public readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  public get currentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  public async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available in this browser.');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('No wallet account was returned.');
    }

    return String(accounts[0]).toLowerCase();
  }

  public async authenticate(): Promise<CurrentUser> {
  const walletAddress = await this.connectWallet();

  const nonceResponse = await firstValueFrom(
    this.http.post<{ nonce: string }>(
      `${environment.apiUrl}/auth/nonce`,
      { walletAddress }
    )
  );

  const nonce = nonceResponse.nonce; // ✅ store it

  const signature = await this.signNonce(nonce);

  const verifyResponse = await firstValueFrom(
    this.http.post<{ token: string }>(
      `${environment.apiUrl}/auth/verify`,
      {
        walletAddress,
        signature,
        nonce, // ✅ ADD THIS LINE
      }
    )
  );

  this.storeToken(verifyResponse.token);
  console.log('Token stored:', localStorage.getItem(this.tokenKey));
  const user = this.decodeUserFromToken(verifyResponse.token);
  console.log('Decoded user:', user);

  if (!user) {
    throw new Error('Unable to decode authenticated user.');
  }

  this.currentUserSubject.next(user);
  return user;
}

  public logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private async signNonce(nonce: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available in this browser.');
    }

    const provider = new BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    return signer.signMessage(nonce);
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
      console.log('Verify saved:', localStorage.getItem(this.tokenKey));
  }

  private loadStoredUser(): CurrentUser | null {
    const token = this.getToken();
    return token ? this.decodeUserFromToken(token) : null;
  }

  private decodeUserFromToken(token: string): CurrentUser | null {
    const decoded = this.decodeJwt<Record<string, string>>(token);
    if (!decoded) return null;

    const walletAddress = decoded['wallet'];
    const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

    if (!walletAddress || !role) {
      return null;
    }

    return {
      walletAddress: walletAddress.toLowerCase(),
      role: role.toUpperCase(),
    };
  }

  private decodeJwt<T>(token: string): T | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload as T;
    } catch {
      return null;
    }
  }

  public async confirmTransaction(txHash: string): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available in this browser.');
    }

    const provider = new BrowserProvider(window.ethereum as any);
    await provider.waitForTransaction(txHash);
  }
}
