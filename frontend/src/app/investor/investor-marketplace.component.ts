import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';
import { interval, switchMap, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { FundLoanDialogComponent } from './fund-loan-dialog.component';

interface MarketLoan {
  id: string;
  smeName: string;
  assetName: string;
  collateralType: string;
  requestedAmount: number;
  durationDays: number;
  loanToValue: number;
  status: string;
  riskProfile: string;
  collateralValue: number;
}

@Component({
  selector: 'app-investor-marketplace',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatChipsModule, MatDialogModule, MatSnackBarModule, SharedModule],
  template: `
    <div class="marketplace-shell">
      <div class="marketplace-header">
        <div>
          <h2>Loan marketplace</h2>
          <p>Browse active loan requests from PMEs and fund those that match your strategy.</p>
        </div>
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Search PME" [formControl]="searchControl" />
        </mat-form-field>
      </div>

      <mat-chip-listbox class="filter-chips" aria-label="Loan filters">
        <mat-chip-option [selected]="selectedFilter === 'ALL'" (click)="setFilter('ALL')">All</mat-chip-option>
        <mat-chip-option [selected]="selectedFilter === 'LOW'" (click)="setFilter('LOW')">Low risk</mat-chip-option>
        <mat-chip-option [selected]="selectedFilter === 'HIGH'" (click)="setFilter('HIGH')">High yield</mat-chip-option>
        <mat-chip-option [selected]="selectedFilter === 'SHORT'" (click)="setFilter('SHORT')">Short term</mat-chip-option>
      </mat-chip-listbox>

      <app-empty-state
        *ngIf="filteredLoans.length === 0"
        icon="account_balance"
        title="No loan requests available"
        subtitle="Check back soon — new requests are refreshed every 30 seconds."
      ></app-empty-state>

      <div class="loan-grid" *ngIf="filteredLoans.length > 0">
        <mat-card class="loan-card" *ngFor="let loan of filteredLoans">
          <div class="loan-top-row">
            <div class="loan-title">{{ loan.smeName }}</div>
            <div class="loan-badges">
              <app-role-badge role="PME"></app-role-badge>
              <app-status-badge [status]="loan.status"></app-status-badge>
            </div>
          </div>
          <div class="loan-subtitle">{{ loan.assetName }} · {{ loan.collateralType }}</div>
          <div class="loan-main-row">
            <div>
              <div class="loan-amount">{{ loan.requestedAmount | number:'1.2-2' }} ETH</div>
              <div class="loan-duration">{{ loan.durationDays }} days</div>
            </div>
            <div class="ltv-badge" [ngClass]="getLtvClass(loan.loanToValue)">{{ loan.loanToValue | number:'1.0-0' }}% LTV</div>
          </div>
          <div class="loan-footer">
            <div>Collateral value {{ loan.collateralValue | number:'1.2-2' }} ETH</div>
            <button mat-flat-button color="primary" (click)="openFundDialog(loan)">Fund this loan</button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .marketplace-shell {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-5);
      }

      .marketplace-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-5);
      }

      .marketplace-header h2 {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .marketplace-header p {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
        margin-top: var(--space-1);
      }

      .search-field {
        max-width: 280px;
        width: 100%;
        flex-shrink: 0;
      }

      .filter-chips {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .loan-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }

      .loan-card {
        padding: var(--space-4) !important;
        display: grid;
        gap: var(--space-3);
      }

      .loan-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
      }

      .loan-title {
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .loan-badges {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        flex-shrink: 0;
      }

      .loan-subtitle {
        color: var(--color-text-secondary);
        font-size: var(--font-size-base);
      }

      .loan-main-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) 0;
        border-top: 0.5px solid var(--color-border);
        border-bottom: 0.5px solid var(--color-border);
      }

      .loan-amount {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        color: var(--color-primary);
      }

      .loan-duration {
        font-size: var(--font-size-base);
        color: var(--color-text-muted);
        margin-top: 2px;
      }

      .ltv-badge {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        letter-spacing: 0.02em;
        flex-shrink: 0;
      }

      .ltv-green { background: var(--color-success-bg); color: var(--color-success); }
      .ltv-amber { background: var(--color-warning-bg); color: var(--color-warning); }
      .ltv-red   { background: var(--color-danger-bg);  color: var(--color-danger);  }

      .loan-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
      }

      @media (max-width: 920px) {
        .loan-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class InvestorMarketplaceComponent {
  searchControl = new FormControl('');
  selectedFilter: 'ALL' | 'LOW' | 'HIGH' | 'SHORT' = 'ALL';
  loans: MarketLoan[] = [];

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  constructor() {
    interval(30000)
      .pipe(
        startWith(0),
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.http.get<MarketLoan[]>(`${environment.apiUrl}/loans`))
      )
      .subscribe({
        next: (loans) => (this.loans = loans),
        error: () => this.snackBar.open('Failed to refresh loan requests', 'Close', { duration: 3000 }),
      });
  }

  get filteredLoans(): MarketLoan[] {
    const search = this.searchControl.value?.toLowerCase() || '';
    return this.loans.filter((loan) => {
      const matchesSearch = loan.smeName.toLowerCase().includes(search);
      const matchesFilter =
        this.selectedFilter === 'ALL' ||
        (this.selectedFilter === 'LOW' && loan.riskProfile === 'LOW') ||
        (this.selectedFilter === 'HIGH' && loan.riskProfile === 'HIGH') ||
        (this.selectedFilter === 'SHORT' && loan.riskProfile === 'SHORT');
      return matchesSearch && matchesFilter;
    });
  }

  setFilter(filter: 'ALL' | 'LOW' | 'HIGH' | 'SHORT'): void {
    this.selectedFilter = filter;
  }

  openFundDialog(loan: MarketLoan): void {
    const dialogRef = this.dialog.open(FundLoanDialogComponent, {
      width: '480px',
      data: loan,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.status === 'FUNDED') {
        this.loans = this.loans.map((item) => (item.id === loan.id ? { ...item, status: 'FUNDED' } : item));
      }
    });
  }

  getLtvClass(ltv: number): string {
    if (ltv < 70) return 'ltv-green';
    if (ltv <= 85) return 'ltv-amber';
    return 'ltv-red';
  }
}