import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { RepayLoanDialogComponent } from './repay-loan-dialog.component';
import { PaginatedResult } from '../shared/models/paginated-result';

interface Asset {
  id: string;
  name: string;
  assetType: string;
  status: string;
  estimatedValue: number;
}

interface ActiveLoan {
  id: string;
  requestedAmount: number;
  assetName: string;
  durationDays: number;
  status: string;
  onChainLoanId?: number;
}

@Component({
  selector: 'app-pme',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    SharedModule,
    RepayLoanDialogComponent,
  ],
  template: `
    <div class="dashboard-shell">
      <section class="dashboard-hero">
        <div>
          <div class="hero-title">Good morning, {{ companyName }}</div>
          <div class="hero-subtitle">{{ todayLabel }}</div>
        </div>
        <a mat-button color="primary" routerLink="/pme/assets">View all assets</a>
      </section>

      <section class="stats-row">
        <app-stat-card label="Total assets" [value]="totalAssets"></app-stat-card>
        <app-stat-card
          label="Active loans"
          [value]="activeLoanCount + ' / ' + (activeLoanTotalEth | number:'1.2-2') + ' ETH'"
        ></app-stat-card>
        <app-stat-card
          label="Repayment rate"
          [value]="repaymentRate + '%'"
          [color]="repaymentRate >= 90 ? 'success' : repaymentRate > 0 ? undefined : undefined"
        ></app-stat-card>
      </section>

      <section class="recent-assets">
        <div class="section-header">
          <h3>Recent assets</h3>
          <a mat-button color="primary" routerLink="/pme/assets">View all →</a>
        </div>

        <app-empty-state
          *ngIf="recentAssets.length === 0"
          icon="inventory_2"
          title="No assets yet"
          subtitle="Add your first asset to start tokenizing and financing."
          buttonLabel="Add asset"
          (buttonClick)="navigateToAssets()"
        ></app-empty-state>

        <table mat-table [dataSource]="recentAssets" *ngIf="recentAssets.length > 0" class="recent-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Asset name</th>
            <td mat-cell *matCellDef="let asset">{{ asset.name }}</td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let asset">{{ asset.assetType }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let asset">
              <app-status-badge [status]="asset.status"></app-status-badge>
            </td>
          </ng-container>
          <ng-container matColumnDef="value">
            <th mat-header-cell *matHeaderCellDef>Estimated value</th>
            <td mat-cell *matCellDef="let asset">{{ asset.estimatedValue | number:'1.2-2' }} ETH</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="recentColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: recentColumns"></tr>
        </table>
      </section>

      <mat-card class="active-loan-card" *ngIf="activeLoan">
        <div class="loan-card-header">
          <div>
            <div class="loan-label">Active loan</div>
            <div class="loan-amount">{{ activeLoan.requestedAmount | number:'1.2-2' }} ETH</div>
          </div>
          <button mat-flat-button color="primary" (click)="repayActiveLoan()">Repay</button>
        </div>
        <div class="loan-detail">Collateral: {{ activeLoan.assetName }}</div>
        <div class="loan-footer">Duration: {{ activeLoan.durationDays }} days</div>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-shell {
      padding: var(--space-5);
      display: grid;
      gap: var(--space-5);
    }

    .dashboard-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-5);
    }

    .hero-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .hero-subtitle {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
      margin-top: var(--space-1);
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
    }

    .recent-assets {
      display: grid;
      gap: var(--space-3);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .recent-table { width: 100%; }

    .active-loan-card {
      padding: var(--space-5) !important;
    }

    .loan-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }

    .loan-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: var(--font-weight-medium);
    }

    .loan-amount {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      margin-top: var(--space-1);
    }

    .loan-detail,
    .loan-footer {
      margin-top: var(--space-3);
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
    }
  `],
})
export class PmeComponent implements OnInit {
  companyName = 'SME';
  todayLabel = formatDate(new Date(), 'MMMM d, y', 'en-US');
  totalAssets = 0;
  activeLoanCount = 0;
  activeLoanTotalEth = 0;
  repaymentRate = 0;
  recentAssets: Asset[] = [];
  activeLoan: ActiveLoan | null = null;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  readonly recentColumns = ['name', 'type', 'status', 'value'];

  ngOnInit(): void {
    const user = this.authService.currentUser;
    this.companyName = user?.companyName || 'SME';
    this.loadDashboard();
  }

  navigateToAssets(): void {
    window.location.href = '/pme/assets';
  }

  loadDashboard(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) return;

    this.http.get<PaginatedResult<Asset>>(`${environment.apiUrl}/assets`, {
      params: { pmeWallet: wallet, page: 1, pageSize: 100 },
    }).subscribe({
      next: (result) => {
        this.totalAssets = result.totalCount;
        this.recentAssets = result.items.slice(0, 5);
      },
      error: () => {
        this.totalAssets = 0;
        this.recentAssets = [];
      },
    });

    this.http.get<PaginatedResult<ActiveLoan>>(`${environment.apiUrl}/loans`, {
      params: { pmeWallet: wallet, page: 1, pageSize: 100 },
    }).subscribe({
      next: (result) => {
        const funded = result.items.filter((l) => l.status === 'FUNDED');
        const repaid = result.items.filter((l) => l.status === 'REPAID').length;
        this.activeLoan = funded[0] || null;
        this.activeLoanCount = funded.length;
        this.activeLoanTotalEth = funded.reduce((sum, l) => sum + l.requestedAmount, 0);
        this.repaymentRate = result.totalCount
          ? Math.round((repaid / result.totalCount) * 100)
          : 0;
      },
      error: () => { this.activeLoan = null; },
    });
  }

  repayActiveLoan(): void {
    if (!this.activeLoan) return;
    const dialogRef = this.dialog.open(RepayLoanDialogComponent, {
      width: '480px',
      data: this.activeLoan,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.status === 'REPAID') {
        this.activeLoan = null;
        this.loadDashboard();
      }
    });
  }
}
