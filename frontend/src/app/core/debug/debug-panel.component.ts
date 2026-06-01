import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
  selector: 'app-debug-state-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Database State Snapshot</h2>
    <mat-dialog-content>
      <pre>{{ data | json }}</pre>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    pre {
      font-size: 11px;
      font-family: monospace;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      max-height: 400px;
      overflow: auto;
    }
  `]
})
export class DebugStateDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="debug-container">
      <!-- Collapsed State -->
      <button *ngIf="!expanded" (click)="expanded = true" class="debug-pill">
        🛠 Dev
      </button>

      <!-- Expanded State -->
      <mat-card *ngIf="expanded" class="debug-card">
        <div class="debug-header">
          <span>Dev tools</span>
          <button mat-icon-button (click)="expanded = false">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="debug-section">
          <p class="section-title">Login as</p>
          <div class="login-buttons">
            <button mat-flat-button color="primary" class="gov-btn" (click)="loginAs('governor')" [disabled]="loading['governor']">
              <mat-spinner *ngIf="loading['governor']" diameter="18"></mat-spinner>
              <span *ngIf="!loading['governor']">Governor</span>
            </button>
            <button mat-flat-button color="accent" class="pme-btn" (click)="loginAs('pme')" [disabled]="loading['pme']">
              <mat-spinner *ngIf="loading['pme']" diameter="18"></mat-spinner>
              <span *ngIf="!loading['pme']">PME</span>
            </button>
            <button mat-flat-button class="inv-btn" (click)="loginAs('investor')" [disabled]="loading['investor']">
              <mat-spinner *ngIf="loading['investor']" diameter="18"></mat-spinner>
              <span *ngIf="!loading['investor']">Investor</span>
            </button>
            <button mat-flat-button class="gua-btn" (click)="loginAs('guarantor')" [disabled]="loading['guarantor']">
              <mat-spinner *ngIf="loading['guarantor']" diameter="18"></mat-spinner>
              <span *ngIf="!loading['guarantor']">Guarantor</span>
            </button>
          </div>
        </div>

        <mat-divider></mat-divider>

        <div class="debug-section row">
          <button mat-stroked-button color="warn" (click)="resetDb()" [disabled]="resetting">
            <mat-spinner *ngIf="resetting" diameter="18"></mat-spinner>
            <span *ngIf="!resetting">Reset DB</span>
          </button>
          <button mat-stroked-button (click)="viewState()">DB State</button>
        </div>

        <mat-divider></mat-divider>

        <div class="debug-info" *ngIf="authService.currentUser$ | async as user">
          <p>Role: {{ user.role }}</p>
          <p>Wallet: {{ truncateWallet(user.walletAddress) }}</p>
          <p>Token expires: {{ tokenExpiry }}</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .debug-container {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
    }

    .debug-pill {
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }

    .debug-card {
      width: 220px;
      border-radius: 10px;
      border: 0.5px solid #eee;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 12px;
    }

    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .debug-header span {
      font-size: 12px;
      font-weight: 500;
      color: #666;
    }

    .debug-header button {
      width: 24px;
      height: 24px;
      line-height: 24px;
    }

    .debug-header mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .debug-section {
      padding: 8px 0;
    }

    .section-title {
      font-size: 11px;
      color: #999;
      margin-bottom: 8px;
    }

    .login-buttons {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .login-buttons button {
      font-size: 12px;
      height: 32px;
    }

    .gov-btn { background-color: #9c27b0 !important; color: white !important; }
    .pme-btn { background-color: #2196f3 !important; color: white !important; }
    .inv-btn { background-color: #4caf50 !important; color: white !important; }
    .gua-btn { background-color: #ffc107 !important; color: white !important; }

    .row {
      display: flex;
      gap: 8px;
    }

    .row button {
      flex: 1;
      font-size: 11px;
      height: 28px;
      padding: 0 4px;
    }

    .debug-info {
      padding-top: 8px;
      font-size: 11px;
      color: #666;
    }

    .debug-info p {
      margin: 2px 0;
    }

    mat-spinner {
      margin: 0 auto;
    }
  `]
})
export class DebugPanelComponent implements OnInit {
  expanded = false;
  loading: Record<string, boolean> = {};
  resetting = false;
  tokenExpiry = 'Unknown';
  lastUsedRole: string | null = null;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.updateExpiry();
    setInterval(() => this.updateExpiry(), 60000);
  }

  loginAs(role: string) {
    this.loading[role] = true;
    this.lastUsedRole = role;
    this.http.get<any>(`${environment.apiUrl}/debug/token/${role}`).subscribe({
      next: (res) => {
        localStorage.setItem('auth_token', res.token);
        // Force AuthService to reload user from token
        // Accessing private loadUserFromToken via any for debug tool
        const user = (this.authService as any).decodeUserFromToken(res.token);
        (this.authService as any).currentUserSubject.next(user);
        
        this.router.navigate([`/${role.toLowerCase()}/dashboard`]);
        this.loading[role] = false;
        this.updateExpiry();
      },
      error: () => {
        this.snackBar.open(`Failed to login as ${role}`, 'Close', { duration: 3000 });
        this.loading[role] = false;
      }
    });
  }

  resetDb() {
    this.resetting = true;
    this.http.delete<any>(`${environment.apiUrl}/debug/reset`).subscribe({
      next: () => {
        this.snackBar.open('Database reset — re-seeded', 'Close', { duration: 3000 });
        this.resetting = false;
        if (this.lastUsedRole) {
          this.loginAs(this.lastUsedRole);
        }
      },
      error: () => {
        this.snackBar.open('Reset failed', 'Close', { duration: 3000 });
        this.resetting = false;
      }
    });
  }

  viewState() {
    this.http.get<any>(`${environment.apiUrl}/debug/state`).subscribe({
      next: (state) => {
        this.dialog.open(DebugStateDialogComponent, {
          data: state,
          width: '500px'
        });
      }
    });
  }

  truncateWallet(wallet: string): string {
    if (!wallet) return '';
    return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
  }

  private updateExpiry() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.tokenExpiry = 'No token';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      const diff = exp - Date.now();
      if (diff < 0) {
        this.tokenExpiry = 'Expired';
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        this.tokenExpiry = `in ${hours}h ${mins}m`;
      }
    } catch {
      this.tokenExpiry = 'Invalid';
    }
  }
}
