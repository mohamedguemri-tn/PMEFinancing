import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { PaginatedResult } from '../shared/models/paginated-result';

interface BackedLoan {
  id: string;
  smeName: string;
  assetName: string;
  requestedAmount: number;
  durationDays: number;
  status: string;
  guarantorAssetName: string | null;
  guarantorAssetValue: number | null;
}

@Component({
  selector: 'app-guarantor-backed-loans',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatPaginatorModule, SharedModule,
  ],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h2>My backed loans</h2>
          <p class="subtitle">Loans you are currently backing. You can withdraw your guarantee while the loan is still REQUESTED.</p>
        </div>
      </div>

      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="You are not backing any loans yet. Browse the marketplace to back a loan."
        [errorText]="errorMessage"
        (retry)="load()"
      ></app-loading-or-empty>

      <table mat-table [dataSource]="loans" *ngIf="loadingState === 'loaded'" class="loans-table">
        <ng-container matColumnDef="pme">
          <th mat-header-cell *matHeaderCellDef>PME</th>
          <td mat-cell *matCellDef="let l">{{ l.smeName }}</td>
        </ng-container>

        <ng-container matColumnDef="asset">
          <th mat-header-cell *matHeaderCellDef>Collateral</th>
          <td mat-cell *matCellDef="let l">{{ l.assetName }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Amount</th>
          <td mat-cell *matCellDef="let l">{{ l.requestedAmount | number:'1.2-2' }} ETH</td>
        </ng-container>

        <ng-container matColumnDef="myAsset">
          <th mat-header-cell *matHeaderCellDef>My backing asset</th>
          <td mat-cell *matCellDef="let l">
            {{ l.guarantorAssetName || '—' }}
            <span class="muted" *ngIf="l.guarantorAssetValue"> · {{ l.guarantorAssetValue | number:'1.2-2' }} ETH</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let l"><app-status-badge [status]="l.status"></app-status-badge></td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let l">
            <button
              mat-stroked-button color="warn"
              *ngIf="l.status === 'REQUESTED'"
              (click)="withdraw(l)">
              Withdraw
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      <mat-paginator
        *ngIf="loadingState === 'loaded'"
        [length]="totalCount"
        [pageSize]="pageSize"
        [pageSizeOptions]="[5, 10, 25]"
        [pageIndex]="currentPage - 1"
        (page)="onPageChange($event)"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [`
    .page-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }
    .page-header h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); margin-top: var(--space-1); font-size: var(--font-size-base); max-width: 540px; }
    .loans-table { width: 100%; }
    .muted { color: var(--color-text-muted); }
  `],
})
export class GuarantorBackedLoansComponent implements OnInit {
  loans: BackedLoan[] = [];
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  columns = ['pme', 'asset', 'amount', 'myAsset', 'status', 'actions'];

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) return;
    this.loadingState = 'loading';
    this.http.get<PaginatedResult<BackedLoan>>(`${environment.apiUrl}/loans/guaranteed`, {
      params: { guarantorWallet: wallet, page: this.currentPage, pageSize: this.pageSize },
    }).subscribe({
      next: (r) => {
        this.loans = r.items;
        this.totalCount = r.totalCount;
        this.loadingState = r.items.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load backed loans. Please try again.';
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
  }

  withdraw(loan: BackedLoan): void {
    this.http.post(`${environment.apiUrl}/loans/${loan.id}/withdraw-guarantee`, {}).subscribe({
      next: () => {
        this.loans = this.loans.filter(l => l.id !== loan.id);
        this.totalCount = Math.max(0, this.totalCount - 1);
        this.snackBar.open('Guarantee withdrawn', 'Close', { duration: 3000 });
        if (this.loans.length === 0) this.loadingState = 'empty';
      },
      error: () => this.snackBar.open('Failed to withdraw guarantee', 'Close', { duration: 3000 }),
    });
  }
}
