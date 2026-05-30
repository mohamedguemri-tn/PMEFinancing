import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';

interface PlatformStats {
  totalUsers: number;
  totalPmes: number;
  totalInvestors: number;
  pendingApprovals: number;
  totalAssets: number;
  tokenizedAssets: number;
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  repaidLoans: number;
  liquidatedLoans: number;
  totalFundedAmount: number;
  totalRepaidAmount: number;
}

interface Activity {
  type: string;
  description: string;
  timestamp: string;
  walletAddress: string;
}

@Component({
  selector: 'app-governor-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, SharedModule],
  template: `
    <div class="dashboard-shell">
      <div class="page-header">
        <div>
          <h2>Platform overview</h2>
          <p class="subtitle">Real-time statistics and recent activity across the platform.</p>
        </div>
        <button mat-stroked-button (click)="loadAll()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <!-- Stats section -->
      <section>
        <app-loading-or-empty
          *ngIf="statsState !== 'loaded'"
          [state]="statsState"
          [errorText]="statsError"
          (retry)="loadStats()"
        ></app-loading-or-empty>

        <div class="stats-grid" *ngIf="statsState === 'loaded' && stats">
          <div class="stat-card">
            <mat-icon class="stat-icon">people</mat-icon>
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">Total users</div>
          </div>

          <div class="stat-card" [class.card-warning]="stats.pendingApprovals > 0">
            <mat-icon class="stat-icon">pending</mat-icon>
            <div class="stat-value">{{ stats.pendingApprovals }}</div>
            <div class="stat-label">Pending approvals</div>
          </div>

          <div class="stat-card">
            <mat-icon class="stat-icon">inventory_2</mat-icon>
            <div class="stat-value">{{ stats.totalAssets }}</div>
            <div class="stat-label">Total assets</div>
          </div>

          <div class="stat-card">
            <mat-icon class="stat-icon">account_balance</mat-icon>
            <div class="stat-value">{{ stats.activeLoans }}</div>
            <div class="stat-label">Active loans</div>
          </div>

          <div class="stat-card" [class.card-danger]="stats.overdueLoans > 0">
            <mat-icon class="stat-icon">warning</mat-icon>
            <div class="stat-value">{{ stats.overdueLoans }}</div>
            <div class="stat-label">Overdue loans</div>
          </div>

          <div class="stat-card">
            <mat-icon class="stat-icon">payments</mat-icon>
            <div class="stat-value">{{ stats.totalFundedAmount | number:'1.2-2' }} ETH</div>
            <div class="stat-label">Total funded</div>
          </div>
        </div>
      </section>

      <!-- Activity section -->
      <section>
        <h3 class="section-title">Recent activity</h3>

        <app-loading-or-empty
          *ngIf="activityState !== 'loaded'"
          [state]="activityState"
          emptyText="No recent activity on the platform."
          [errorText]="activityError"
          (retry)="loadActivity()"
        ></app-loading-or-empty>

        <div class="activity-feed" *ngIf="activityState === 'loaded'">
          <div class="activity-row" *ngFor="let item of activities">
            <span class="activity-dot" [ngClass]="dotClass(item.type)">●</span>
            <span class="activity-type" [ngClass]="typeClass(item.type)">{{ item.type }}</span>
            <span class="activity-desc">{{ item.description }}</span>
            <span class="activity-time">{{ timeAgo(item.timestamp) }}</span>
          </div>
          <div class="activity-empty" *ngIf="activities.length === 0">
            No recent activity.
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }
    .page-header h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); margin-top: var(--space-1); font-size: var(--font-size-base); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr; } }

    .stat-card {
      background: var(--color-surface);
      border: 0.5px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .stat-card.card-warning {
      background: var(--color-warning-bg);
      border-color: var(--color-warning);
    }
    .stat-card.card-danger {
      background: var(--color-danger-bg);
      border-color: var(--color-danger);
    }
    .stat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-text-secondary); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); line-height: 1.2; }
    .stat-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: var(--font-weight-medium); }

    .section-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); color: var(--color-text-primary); margin-bottom: var(--space-3); }

    .activity-feed {
      background: var(--color-surface);
      border: 0.5px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .activity-row {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 0.5px solid var(--color-border);
    }
    .activity-row:last-child { border-bottom: none; }

    .activity-dot { font-size: 10px; }
    .dot-funded   { color: var(--color-success); }
    .dot-repaid   { color: var(--color-governor, #7c3aed); }
    .dot-requested { color: var(--color-primary); }
    .dot-liquidated { color: var(--color-danger); }
    .dot-registered { color: var(--color-primary); }

    .activity-type {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      white-space: nowrap;
      font-family: monospace;
    }
    .type-funded    { background: var(--color-success-bg); color: var(--color-success); }
    .type-repaid    { background: var(--color-governor-bg, #ede9fe); color: var(--color-governor, #7c3aed); }
    .type-requested { background: var(--color-primary-bg); color: var(--color-primary); }
    .type-liquidated { background: var(--color-danger-bg); color: var(--color-danger); }
    .type-registered { background: var(--color-primary-bg); color: var(--color-primary); }

    .activity-desc { font-size: var(--font-size-base); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .activity-time { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .activity-empty { padding: var(--space-5); text-align: center; color: var(--color-text-muted); font-size: var(--font-size-base); }
  `],
})
export class GovernorDashboardComponent implements OnInit {
  stats: PlatformStats | null = null;
  activities: Activity[] = [];
  statsState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  activityState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  statsError = '';
  activityError = '';

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadStats();
    this.loadActivity();
  }

  loadStats(): void {
    this.statsState = 'loading';
    this.http.get<PlatformStats>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: (data) => {
        this.stats = data;
        this.statsState = 'loaded';
      },
      error: () => {
        this.statsState = 'error';
        this.statsError = 'Failed to load platform statistics.';
      },
    });
  }

  loadActivity(): void {
    this.activityState = 'loading';
    this.http.get<Activity[]>(`${environment.apiUrl}/admin/activity`).subscribe({
      next: (data) => {
        this.activities = data;
        this.activityState = data.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.activityState = 'error';
        this.activityError = 'Failed to load recent activity.';
      },
    });
  }

  dotClass(type: string): string {
    const map: Record<string, string> = {
      LOAN_FUNDED: 'dot-funded',
      LOAN_REPAID: 'dot-repaid',
      LOAN_REQUESTED: 'dot-requested',
      LOAN_LIQUIDATED: 'dot-liquidated',
      USER_REGISTERED: 'dot-registered',
    };
    return map[type] ?? '';
  }

  typeClass(type: string): string {
    const map: Record<string, string> = {
      LOAN_FUNDED: 'type-funded',
      LOAN_REPAID: 'type-repaid',
      LOAN_REQUESTED: 'type-requested',
      LOAN_LIQUIDATED: 'type-liquidated',
      USER_REGISTERED: 'type-registered',
    };
    return map[type] ?? '';
  }

  timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
