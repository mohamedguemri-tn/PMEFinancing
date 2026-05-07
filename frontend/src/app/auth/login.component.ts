import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WalletService } from './wallet.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="login-shell">
      <mat-card class="login-card">
        <h2>Connect with MetaMask</h2>
        <p>Authenticate using your wallet to access the SME financing platform.</p>

        <button mat-flat-button color="primary" (click)="onConnect()" [disabled]="loading">
          <ng-container *ngIf="!loading">Connect with MetaMask</ng-container>
          <ng-container *ngIf="loading">Connecting...</ng-container>
        </button>

        <mat-progress-spinner *ngIf="loading" mode="indeterminate" diameter="40"></mat-progress-spinner>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-shell {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 24px;
        background: #f5f5f5;
      }

      .login-card {
        width: min(480px, 100%);
        padding: 32px;
        text-align: center;
      }

      button {
        margin-top: 24px;
      }

      .error {
        margin-top: 20px;
        color: #d32f2f;
      }
    `,
  ],
})
export class LoginComponent {
  loading = false;
  errorMessage = '';

  constructor(private walletService: WalletService, private router: Router) {
    if (this.walletService.isAuthenticated()) {
      this.redirectToDashboard();
    }
  }

  async onConnect(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const user = await this.walletService.authenticate();
      this.redirectByRole(user.role);
    } catch (error) {
      this.errorMessage = (error as Error)?.message || 'Authentication failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private redirectByRole(role: string): void {
    const route = role.toLowerCase();
    const target = ['/login', '/pme', '/investor', '/governor'].includes(`/${route}`) ? `/${route}` : '/login';
    this.router.navigateByUrl(target);
  }

  private redirectToDashboard(): void {
    const role = this.walletService.currentUser?.role.toLowerCase();
    if (role === 'pme' || role === 'investor' || role === 'governor') {
      this.router.navigateByUrl(`/${role}`);
    }
  }
}
