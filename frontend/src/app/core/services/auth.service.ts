import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CurrentUser } from '../../auth/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private readonly currentUserSubject = new BehaviorSubject<CurrentUser | null>(this.loadUserFromToken());
  public readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  public get currentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  public getCurrentUser(): Observable<CurrentUser | null> {
    return this.currentUser$;
  }

  public isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = this.decodeJwt<Record<string, unknown>>(token);
    if (!payload || typeof payload['exp'] !== 'number') {
      return false;
    }

    return Math.floor(Date.now() / 1000) < payload['exp'];
  }

  public getNonce(walletAddress: string): Observable<string> {
    return this.http
      .post<{ nonce: string }>(`${environment.apiUrl}/auth/nonce`, { walletAddress })
      .pipe(map((response) => response.nonce));
  }

  public register(
    walletAddress: string,
    signature: string,
    role: string,
    profileData: Record<string, string>
  ): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/register`, {
      walletAddress,
      signature,
      role,
      profileData,
    });
  }

  public login(walletAddress: string, signature: string): Observable<CurrentUser> {
    return this.http
      .post<{ token: string }>(`${environment.apiUrl}/auth/login`, { walletAddress, signature })
      .pipe(
        tap((response) => this.storeToken(response.token)),
        map((response) => {
          const user = this.decodeUserFromToken(response.token);
          if (!user) {
            throw new Error('Unable to decode authenticated user.');
          }
          this.currentUserSubject.next(user);
          return user;
        })
      );
  }

  public logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearAuth()),
      catchError((error) => {
        this.clearAuth();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private loadUserFromToken(): CurrentUser | null {
    const token = this.getToken();
    return token ? this.decodeUserFromToken(token) : null;
  }

  private decodeUserFromToken(token: string): CurrentUser | null {
    const payload = this.decodeJwt<Record<string, unknown>>(token);
    if (!payload) {
      return null;
    }

    const walletAddress = String(payload['wallet'] || '').toLowerCase();
    const role = String(payload['role'] || '').toUpperCase();
    const userId = String(payload['userId'] || '');

    if (!walletAddress || !role || !userId) {
      return null;
    }

    const companyName = String(payload['companyName'] || payload['name'] || payload['company'] || '');

    return {
      walletAddress,
      role,
      userId,
      companyName: companyName || undefined,
    };
  }

  private decodeJwt<T>(token: string): T | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payloadJson) as T;
    } catch {
      return null;
    }
  }
}
