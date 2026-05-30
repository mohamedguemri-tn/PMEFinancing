import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';
import { PaginatedResult } from '../shared/models/paginated-result';

interface OverdueLoan {
  id: string;
  pmeName: string;
  assetName: string;
  requestedAmount: number;
  dueDate: string;
  daysOverdue: number;
  investorWallet: string | null;
  onChainLoanId: number | null;
}

@Component({
  selector: 'app-governor-overdue-loans',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatPaginatorModule,
    SharedModule,
  ],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h2>Overdue loans</h2>
          <p class="subtitle">Funded loans that have passed their repayment due date. The investor must trigger liquidation from their account.</p>
        </div>
        <div class="count-pill" *ngIf="totalCount > 0">{{ totalCount }} overdue</div>
      </div>

      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="No overdue loans. All funded loans are within their repayment period."
        [errorText]="errorMessage"
        (retry)="load()"
      ></app-loading-or-empty>

      <table mat-table [dataSource]="loans" *ngIf="loadingState === 'loaded'" class="overdue-table">

        <ng-container matColumnDef="pme">
          <th mat-header-cell *matHeaderCellDef>PME</th>
          <td mat-cell *matCellDef="let loan">{{ loan.pmeName }}</td>
        </ng-container>

        <ng-container matColumnDef="asset">
          <th mat-header-cell *matHeaderCellDef>Asset</th>
          <td mat-cell *matCellDef="let loan">{{ loan.assetName }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Amount</th>
          <td mat-cell *matCellDef="let loan">{{ loan.requestedAmount | number:'1.2-2' }} ETH</td>
        </ng-container>

        <ng-container matColumnDef="dueDate">
          <th mat-header-cell *matHeaderCellDef>Due date</th>
          <td mat-cell *matCellDef="let loan">{{ loan.dueDate | date:'mediumDate' }}</td>
        </ng-container>

        <ng-container matColumnDef="daysOverdue">
          <th mat-header-cell *matHeaderCellDef>Days overdue</th>
          <td mat-cell *matCellDef="let loan">
            <span class="overdue-badge">{{ loan.daysOverdue }}d overdue</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="investor">
          <th mat-header-cell *matHeaderCellDef>Investor wallet</th>
          <td mat-cell *matCellDef="let loan" class="wallet-cell">
            <span *ngIf="loan.investorWallet">
              {{ loan.investorWallet | slice:0:10 }}...{{ loan.investorWallet | slice:-6 }}
            </span>
            <span *ngIf="!loan.investorWallet" class="muted">—</span>
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
    .count-pill { background: var(--color-danger-bg); color: var(--color-danger); padding: var(--space-2) var(--space-3); border-radius: var(--radius-pill); font-weight: var(--font-weight-medium); font-size: var(--font-size-base); white-space: nowrap; }
    .overdue-table { width: 100%; }
    .overdue-badge { background: var(--color-danger-bg); color: var(--color-danger); padding: 2px var(--space-2); border-radius: var(--radius-pill); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
    .wallet-cell { font-family: monospace; font-size: var(--font-size-sm); }
    .muted { color: var(--color-text-muted); }
  `],
})
export class GovernorOverdueLoansComponent implements OnInit {
  loans: OverdueLoan[] = [];
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  columns = ['pme', 'asset', 'amount', 'dueDate', 'daysOverdue', 'investor'];

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadingState = 'loading';
    this.http.get<PaginatedResult<OverdueLoan>>(`${environment.apiUrl}/admin/loans/overdue`, {
      params: { page: this.currentPage, pageSize: this.pageSize },
    }).subscribe({
      next: (result) => {
        this.loans = result.items;
        this.totalCount = result.totalCount;
        this.loadingState = result.items.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load overdue loans. Please try again.';
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
  }
}
