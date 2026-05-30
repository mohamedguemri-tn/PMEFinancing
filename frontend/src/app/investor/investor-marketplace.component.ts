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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';
import { interval, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { FundLoanDialogComponent } from './fund-loan-dialog.component';
import { PaginatedResult } from '../shared/models/paginated-result';

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
  hasGuarantor: boolean;
  guarantorAssetName: string | null;
  guarantorAssetValue: number | null;
}

@Component({
  selector: 'app-investor-marketplace',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatChipsModule, MatDialogModule, MatSnackBarModule, MatPaginatorModule, SharedModule],
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

      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="No loan requests available. Check back soon — new requests are refreshed every 30 seconds."
        [errorText]="errorMessage"
        (retry)="load()"
      ></app-loading-or-empty>

      <ng-container *ngIf="loadingState === 'loaded'">
        <app-empty-state
          *ngIf="filteredLoans.length === 0"
          icon="account_balance"
          title="No matching loans"
          subtitle="Try adjusting your search or filter."
        ></app-empty-state>

        <div class="loan-grid" *ngIf="filteredLoans.length > 0">
          <mat-card class="loan-card" *ngFor="let loan of filteredLoans">
            <div class="loan-top-row">
              <div class="loan-title">{{ loan.smeName }}</div>
              <div class="loan-badges">
                <span class="guaranteed-chip" *ngIf="loan.hasGuarantor">✓ Guaranteed</span>
                <app-status-badge [status]="loan.status"></app-status-badge>
              </div>
            </div>

            <div class="loan-info">
              <div class="info-row">
                <span class="info-label">Asset</span>
                <span>{{ loan.assetName }} ({{ loan.collateralType }})</span>
              </div>
              <div class="info-row">
                <span class="info-label">Asset value</span>
                <span>{{ loan.collateralValue | number:'1.2-2' }} ETH</span>
              </div>
              <div class="info-row">
                <span class="info-label">Loan amount</span>
                <div class="amount-ltv">
                  <span class="loan-amount">{{ loan.requestedAmount | number:'1.2-2' }} ETH</span>
                  <span class="ltv-badge" [ngClass]="getLtvClass(loan.loanToValue)">{{ loan.loanToValue | number:'1.0-0' }}% LTV</span>
                </div>
              </div>
              <div class="info-row">
                <span class="info-label">Duration</span>
                <span>{{ loan.durationDays }} days</span>
              </div>
            </div>

            <div class="guarantor-detail" *ngIf="loan.hasGuarantor && loan.guarantorAssetName">
              Backed by {{ loan.guarantorAssetName }} ({{ loan.guarantorAssetValue | number:'1.2-2' }} ETH)
            </div>

            <div class="loan-footer">
              <button mat-flat-button color="primary" (click)="openFundDialog(loan)">Fund this loan</button>
            </div>
          </mat-card>
        </div>
      <mat-paginator
        [length]="totalCount"
        [pageSize]="pageSize"
        [pageSizeOptions]="[6, 12, 24]"
        [pageIndex]="currentPage - 1"
        (page)="onPageChange($event)"
        showFirstLastButtons>
      </mat-paginator>
      </ng-container>
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
        align-items: center;
      }

      .guaranteed-chip {
        display: inline-flex;
        align-items: center;
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 0.5px solid var(--color-success);
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        white-space: nowrap;
      }

      .loan-info {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3) 0;
        border-top: 0.5px solid var(--color-border);
        border-bottom: 0.5px solid var(--color-border);
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--font-size-base);
      }

      .info-label {
        color: var(--color-text-secondary);
        flex-shrink: 0;
      }

      .amount-ltv {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .loan-amount {
        font-weight: var(--font-weight-medium);
        color: var(--color-primary);
      }

      .ltv-badge {
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        flex-shrink: 0;
      }

      .ltv-green { background: var(--color-success-bg); color: var(--color-success); }
      .ltv-amber { background: var(--color-warning-bg); color: var(--color-warning); }
      .ltv-red   { background: var(--color-danger-bg);  color: var(--color-danger);  }

      .guarantor-detail {
        font-size: var(--font-size-xs);
        color: var(--color-success);
        background: var(--color-success-bg);
        border-radius: var(--radius-sm);
        padding: 4px var(--space-2);
      }

      .loan-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
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
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';

  currentPage = 1;
  pageSize = 12;
  totalCount = 0;

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.load();
    // Background refresh preserves current page — does not reset to page 1.
    interval(30000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.http.get<PaginatedResult<MarketLoan>>(`${environment.apiUrl}/loans`, {
          params: { page: this.currentPage, pageSize: this.pageSize }
        }))
      )
      .subscribe({
        next: (result) => {
          this.loans = result.items;
          this.totalCount = result.totalCount;
        },
        error: () => {},
      });
  }

  load(): void {
    this.loadingState = 'loading';
    this.http.get<PaginatedResult<MarketLoan>>(`${environment.apiUrl}/loans`, {
      params: { page: this.currentPage, pageSize: this.pageSize }
    }).subscribe({
      next: (result) => {
        this.loans = result.items;
        this.totalCount = result.totalCount;
        this.loadingState = result.totalCount > 0 ? 'loaded' : 'empty';
      },
      error: () => {
        this.loans = [];
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load loan requests. Please try again.';
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
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
    this.currentPage = 1;
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