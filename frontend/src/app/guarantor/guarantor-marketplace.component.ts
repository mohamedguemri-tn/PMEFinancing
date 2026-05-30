import { Component, inject, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
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
  collateralValue: number;
  hasGuarantor: boolean;
}

interface GuarantorAsset {
  id: string;
  name: string;
  estimatedValue: number;
}

// ── Back this loan dialog ────────────────────────────────────────────────────

@Component({
  selector: 'app-back-loan-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Back this loan</h2>
    <mat-dialog-content>
      <p class="summary">
        <strong>{{ data.loan.smeName }}</strong> · {{ data.loan.assetName }} ·
        {{ data.loan.requestedAmount | number:'1.2-2' }} ETH · {{ data.loan.durationDays }} days
      </p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Select your asset to back this loan</mat-label>
        <mat-select [(ngModel)]="selectedAssetId">
          <mat-option *ngFor="let a of data.assets" [value]="a.id">
            {{ a.name }} — {{ a.estimatedValue | number:'1.2-2' }} ETH
          </mat-option>
        </mat-select>
      </mat-form-field>
      <p class="note" *ngIf="data.assets.length === 0">
        You need to add assets before you can back a loan. Go to My Assets to add one.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
        [disabled]="!selectedAssetId"
        (click)="confirm()">
        Confirm
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-top: var(--space-3); } .summary { color: var(--color-text-secondary); } .note { color: var(--color-warning); font-size: var(--font-size-sm); }`],
})
export class BackLoanDialogComponent {
  selectedAssetId: string | null = null;
  private dialogRef = inject(MatDialogRef<BackLoanDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { loan: MarketLoan; assets: GuarantorAsset[] }) {}

  confirm(): void {
    this.dialogRef.close({ guarantorAssetId: this.selectedAssetId });
  }
}

// ── Marketplace component ────────────────────────────────────────────────────

@Component({
  selector: 'app-guarantor-marketplace',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, MatPaginatorModule, SharedModule,
  ],
  template: `
    <div class="marketplace-shell">
      <div class="page-header">
        <div>
          <h2>Loan marketplace</h2>
          <p class="subtitle">Loans that still need a guarantor. Back them with one of your registered assets.</p>
        </div>
      </div>

      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="No unguaranteed loans right now. Check back soon."
        [errorText]="errorMessage"
        (retry)="load()"
      ></app-loading-or-empty>

      <ng-container *ngIf="loadingState === 'loaded'">
        <app-empty-state
          *ngIf="loans.length === 0"
          icon="verified_user"
          title="No loans need a guarantor"
          subtitle="All current loan requests already have guarantors or none are open."
        ></app-empty-state>

        <div class="loan-grid" *ngIf="loans.length > 0">
          <mat-card class="loan-card" *ngFor="let loan of loans">
            <div class="loan-top-row">
              <div class="loan-title">{{ loan.smeName }}</div>
              <app-status-badge [status]="loan.status"></app-status-badge>
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
                  <span class="ltv-badge" [ngClass]="ltvClass(loan.loanToValue)">{{ loan.loanToValue | number:'1.0-0' }}% LTV</span>
                </div>
              </div>
              <div class="info-row">
                <span class="info-label">Duration</span>
                <span>{{ loan.durationDays }} days</span>
              </div>
            </div>

            <div class="loan-footer">
              <button mat-flat-button color="primary" (click)="openBackDialog(loan)">Back this loan</button>
            </div>
          </mat-card>
        </div>

        <mat-paginator
          *ngIf="loans.length > 0"
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
  styles: [`
    .marketplace-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }
    .page-header h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); margin-top: var(--space-1); font-size: var(--font-size-base); }
    .loan-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
    @media (max-width: 920px) { .loan-grid { grid-template-columns: 1fr; } }
    .loan-card { padding: var(--space-4) !important; display: grid; gap: var(--space-3); }
    .loan-top-row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
    .loan-title { font-size: var(--font-size-md); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .loan-info { display: grid; gap: var(--space-2); padding: var(--space-3) 0; border-top: 0.5px solid var(--color-border); border-bottom: 0.5px solid var(--color-border); }
    .info-row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); font-size: var(--font-size-base); }
    .info-label { color: var(--color-text-secondary); flex-shrink: 0; }
    .amount-ltv { display: flex; align-items: center; gap: var(--space-2); }
    .loan-amount { font-weight: var(--font-weight-medium); color: var(--color-primary); }
    .ltv-badge { padding: 2px var(--space-2); border-radius: var(--radius-pill); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); flex-shrink: 0; }
    .ltv-green { background: var(--color-success-bg); color: var(--color-success); }
    .ltv-amber { background: var(--color-warning-bg); color: var(--color-warning); }
    .ltv-red { background: var(--color-danger-bg); color: var(--color-danger); }
    .loan-footer { display: flex; justify-content: flex-end; align-items: center; }
  `],
})
export class GuarantorMarketplaceComponent implements OnInit {
  loans: MarketLoan[] = [];
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';
  currentPage = 1;
  pageSize = 12;
  totalCount = 0;

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadingState = 'loading';
    this.http.get<PaginatedResult<MarketLoan>>(`${environment.apiUrl}/loans`, {
      params: { page: this.currentPage, pageSize: this.pageSize },
    }).subscribe({
      next: (r) => {
        this.loans = r.items.filter(l => !l.hasGuarantor);
        this.totalCount = this.loans.length;
        this.loadingState = r.totalCount > 0 ? 'loaded' : 'empty';
      },
      error: () => {
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load loans. Please try again.';
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
  }

  openBackDialog(loan: MarketLoan): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) return;

    this.http.get<PaginatedResult<GuarantorAsset>>(`${environment.apiUrl}/assets`, {
      params: { pmeWallet: wallet, page: 1, pageSize: 100 },
    }).subscribe({
      next: (r) => {
        const ref = this.dialog.open(BackLoanDialogComponent, {
          width: '480px',
          data: { loan, assets: r.items },
        });
        ref.afterClosed().subscribe((result) => {
          if (result?.guarantorAssetId) {
            this.http.post(`${environment.apiUrl}/loans/${loan.id}/back`, { guarantorAssetId: result.guarantorAssetId }).subscribe({
              next: () => {
                this.loans = this.loans.filter(l => l.id !== loan.id);
                this.snackBar.open('Loan backed successfully', 'Close', { duration: 3000 });
              },
              error: () => this.snackBar.open('Failed to back loan', 'Close', { duration: 3000 }),
            });
          }
        });
      },
      error: () => this.snackBar.open('Failed to load your assets', 'Close', { duration: 3000 }),
    });
  }

  ltvClass(ltv: number): string {
    if (ltv < 70) return 'ltv-green';
    if (ltv <= 85) return 'ltv-amber';
    return 'ltv-red';
  }
}
