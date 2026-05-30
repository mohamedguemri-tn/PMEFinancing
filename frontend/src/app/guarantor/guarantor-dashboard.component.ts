import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { PaginatedResult } from '../shared/models/paginated-result';

interface GuaranteedLoan {
  guarantorAssetValue: number | null;
  status: string;
}

@Component({
  selector: 'app-guarantor-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, SharedModule],
  template: `
    <div class="dashboard-shell">
      <section class="dashboard-hero">
        <div>
          <div class="hero-title">Guarantor dashboard</div>
          <div class="hero-subtitle">Track your assets and the loans you are backing.</div>
        </div>
      </section>

      <section class="stats-row">
        <app-stat-card label="My assets" [value]="totalAssets"></app-stat-card>
        <app-stat-card label="Loans I'm backing" [value]="loansBackingCount"></app-stat-card>
        <app-stat-card
          label="Total value guaranteed"
          [value]="(totalValueGuaranteed | number:'1.2-2') + ' ETH'"
        ></app-stat-card>
      </section>

      <section class="actions-row">
        <button mat-raised-button color="primary" (click)="router.navigate(['/guarantor/assets'])">
          <mat-icon>add</mat-icon> Add asset
        </button>
        <button mat-stroked-button color="primary" (click)="router.navigate(['/guarantor/marketplace'])">
          <mat-icon>search</mat-icon> Browse loans
        </button>
        <button mat-stroked-button (click)="router.navigate(['/guarantor/backed-loans'])">
          <mat-icon>verified_user</mat-icon> My backed loans
        </button>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }

    .dashboard-hero { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); }
    .hero-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .hero-subtitle { font-size: var(--font-size-base); color: var(--color-text-secondary); margin-top: var(--space-1); }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }
    @media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } }

    .actions-row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
  `],
})
export class GuarantorDashboardComponent implements OnInit {
  totalAssets = 0;
  loansBackingCount = 0;
  totalValueGuaranteed = 0;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  router = inject(Router);

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) return;

    this.http.get<PaginatedResult<{ id: string }>>(`${environment.apiUrl}/assets`, {
      params: { pmeWallet: wallet, page: 1, pageSize: 1 },
    }).subscribe({
      next: (r) => { this.totalAssets = r.totalCount; },
      error: () => {},
    });

    this.http.get<PaginatedResult<GuaranteedLoan>>(`${environment.apiUrl}/loans/guaranteed`, {
      params: { guarantorWallet: wallet, page: 1, pageSize: 100 },
    }).subscribe({
      next: (r) => {
        this.loansBackingCount = r.totalCount;
        this.totalValueGuaranteed = r.items
          .filter(l => l.status === 'REQUESTED' || l.status === 'FUNDED')
          .reduce((sum, l) => sum + (l.guarantorAssetValue ?? 0), 0);
      },
      error: () => {},
    });
  }
}
