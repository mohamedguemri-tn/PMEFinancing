import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';

interface RegistrationPreview {
  id: string;
  name: string;
  walletAddress: string;
  role: string;
}

interface AuditEvent {
  id: string;
  eventType: string;
  wallet: string;
  txHash: string;
  timestamp: string;
}

@Component({
  selector: 'app-governor-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatDividerModule, MatSnackBarModule, SharedModule],
  template: `
    <div class="dashboard-shell">
      <section class="stats-grid">
        <app-stat-card label="Total users" [value]="totalUsers"></app-stat-card>
        <app-stat-card
          label="Pending approvals"
          [value]="pendingApprovals"
          [color]="pendingApprovals > 0 ? 'warning' : undefined"
        ></app-stat-card>
        <app-stat-card label="Active loans" [value]="activeLoans"></app-stat-card>
        <app-stat-card
          label="Platform TVL"
          [value]="(platformTvl | number:'1.2-2') + ' ETH'"
        ></app-stat-card>
      </section>

      <section class="overview-row">
        <mat-card class="preview-card">
          <div class="preview-header">
            <div>
              <h3>Pending registrations</h3>
              <p class="subtitle">Last 3 requests awaiting review.</p>
            </div>
            <button mat-button color="primary" (click)="viewAllRegistrations()">View all →</button>
          </div>

          <app-empty-state
            *ngIf="pendingRegistrations.length === 0"
            icon="group"
            title="No pending registrations"
            subtitle="All caught up!"
          ></app-empty-state>

          <table mat-table [dataSource]="pendingRegistrations" *ngIf="pendingRegistrations.length > 0" class="mat-elevation-z0">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>User</th>
              <td mat-cell *matCellDef="let item">{{ item.name }}</td>
            </ng-container>
            <ng-container matColumnDef="wallet">
              <th mat-header-cell *matHeaderCellDef>Wallet</th>
              <td mat-cell *matCellDef="let item"><span class="monospace">{{ truncateWallet(item.walletAddress) }}</span></td>
            </ng-container>
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Role</th>
              <td mat-cell *matCellDef="let item"><app-role-badge [role]="item.role"></app-role-badge></td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let item">
                <button mat-button color="primary" (click)="approve(item)">Approve</button>
                <button mat-button color="warn" (click)="reject(item)">Reject</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="previewColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: previewColumns"></tr>
          </table>
        </mat-card>

        <mat-card class="events-card">
          <div class="section-header">
            <h3>Recent audit events</h3>
          </div>
          <div class="event-row" *ngFor="let event of auditEvents">
            <span class="event-badge" [ngClass]="badgeClass(event.eventType)">{{ event.eventType }}</span>
            <span class="event-wallet monospace">{{ truncateWallet(event.wallet) }}</span>
            <a [href]="buildTxLink(event.txHash)" target="_blank" rel="noopener" class="event-tx monospace">
              {{ truncateHash(event.txHash) }}
              <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">open_in_new</mat-icon>
            </a>
            <span class="event-time">{{ event.timestamp | date:'short' }}</span>
          </div>
          <div *ngIf="auditEvents.length === 0" class="events-empty">No events yet.</div>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-shell {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-5);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-4);
    }

    @media (max-width: 960px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
    }

    .overview-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-4);
    }

    @media (max-width: 960px) {
      .overview-row { grid-template-columns: 1fr; }
    }

    .preview-card, .events-card {
      padding: var(--space-4) !important;
    }

    .preview-header, .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }

    .preview-header h3, .section-header h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .subtitle {
      margin-top: var(--space-1);
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
    }

    table { width: 100%; }
    .monospace { font-family: monospace, monospace; font-size: var(--font-size-xs); }

    .event-row {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: var(--space-3);
      align-items: center;
      padding: var(--space-3) 0;
      border-bottom: 0.5px solid var(--color-border);
    }

    .event-badge {
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }

    /* Event badge colors */
    .badge-user-registered   { background: var(--color-primary-bg);  color: var(--color-primary); }
    .badge-user-revoked      { background: var(--color-danger-bg);   color: var(--color-danger); }
    .badge-asset-tokenized   { background: var(--color-governor-bg); color: var(--color-governor); }
    .badge-loan-funded       { background: var(--color-success-bg);  color: var(--color-success); }
    .badge-loan-repaid       { background: var(--color-success-bg);  color: var(--color-success); }
    .badge-loan-defaulted    { background: var(--color-danger-bg);   color: var(--color-danger); }

    .event-wallet, .event-tx {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .event-tx {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-primary);
      text-decoration: none;
    }

    .event-time {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      white-space: nowrap;
    }

    .events-empty {
      color: var(--color-text-muted);
      font-size: var(--font-size-base);
      padding: var(--space-4) 0;
      text-align: center;
    }
  `],
})
export class GovernorDashboardComponent implements OnInit {
  totalUsers = 0;
  pendingApprovals = 0;
  activeLoans = 0;
  platformTvl = 0;
  pendingRegistrations: RegistrationPreview[] = [];
  auditEvents: AuditEvent[] = [];
  previewColumns = ['name', 'wallet', 'role', 'actions'];

  private http = inject(HttpClient);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadDashboard();
  }

  viewAllRegistrations(): void {
    this.router.navigate(['/governor/registrations']);
  }

  approve(item: RegistrationPreview): void {
    this.http.post(`${environment.apiUrl}/admin/users/${item.id}/approve`, {}).subscribe(() => {
      this.pendingRegistrations = this.pendingRegistrations.filter((e) => e.id !== item.id);
      this.pendingApprovals = Math.max(0, this.pendingApprovals - 1);
    });
  }

  reject(item: RegistrationPreview): void {
    this.http.delete(`${environment.apiUrl}/admin/users/${item.id}/reject`).subscribe(() => {
      this.pendingRegistrations = this.pendingRegistrations.filter((e) => e.id !== item.id);
      this.pendingApprovals = Math.max(0, this.pendingApprovals - 1);
    });
  }

  private loadDashboard(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: (data) => {
        this.totalUsers = data.totalUsers;
        this.pendingApprovals = data.pendingApprovals;
        this.activeLoans = data.activeLoans;
        this.platformTvl = data.platformTvl;
      },
    });

    this.http.get<any[]>(`${environment.apiUrl}/admin/users/pending`).subscribe({
      next: (users) => {
        this.pendingRegistrations = (users || []).slice(0, 3).map(u => ({
          id: u.userId,
          name: u.profileData?.companyName || u.profileData?.fullName || u.walletAddress,
          walletAddress: u.walletAddress,
          role: u.role,
        }));
      },
      error: () => { this.pendingRegistrations = []; },
    });
  }

  badgeClass(eventType: string): string {
    return `badge-${eventType.toLowerCase().replace(/_/g, '-')}`;
  }

  truncateWallet(value: string): string {
    return value?.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
  }

  truncateHash(hash: string): string {
    return hash?.length > 14 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;
  }

  buildTxLink(hash: string): string {
    return `https://etherscan.io/tx/${hash}`;
  }
}
