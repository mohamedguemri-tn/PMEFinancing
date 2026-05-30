import { Component, AfterViewInit, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';
import { BrowserProvider, Contract } from 'ethers';
import { firstValueFrom } from 'rxjs';
import { Inject } from '@angular/core';

const LOAN_MANAGER_ABI = [
  'function liquidateCollateral(uint256 loanId)',
  'event CollateralLiquidated(uint256 indexed loanId, address indexed investor, uint256 collateralTokenId)',
];

interface InvestmentLoan {
  id: string;
  smeName: string;
  amount: number;
  date: string;
  status: string;
  dueDate?: string;
  onChainLoanId?: number;
}

@Component({
  selector: 'app-liquidate-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, SharedModule],
  template: `
    <h2 mat-dialog-title>Liquidate collateral</h2>
    <mat-dialog-content>
      <p>This will transfer the NFT collateral to your wallet. <strong>This cannot be undone.</strong></p>
      <p class="detail">Loan from <strong>{{ data.smeName }}</strong> — {{ data.amount | number:'1.2-2' }} ETH</p>
      <app-tx-feedback [state]="txState" [message]="txMessage"></app-tx-feedback>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()" [disabled]="txState !== 'idle'">Cancel</button>
      <button mat-raised-button color="warn" (click)="confirm()" [disabled]="txState !== 'idle'">
        Liquidate
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.detail { color: var(--color-text-secondary); margin-top: var(--space-2); }`],
})
export class LiquidateConfirmDialogComponent {
  public dialogRef = inject(MatDialogRef<LiquidateConfirmDialogComponent>);
  private http = inject(HttpClient);

  txState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  txMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: InvestmentLoan) {}

  async confirm(): Promise<void> {
    if (this.txState !== 'idle') return;

    if (this.data.onChainLoanId == null) {
      this.txState = 'error';
      this.txMessage = 'Loan has no on-chain ID — cannot liquidate.';
      return;
    }

    this.txState = 'waiting';
    this.txMessage = 'Waiting for MetaMask confirmation…';

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(environment.loanManagerAddress, LOAN_MANAGER_ABI, signer);

      const tx = await contract['liquidateCollateral'](BigInt(this.data.onChainLoanId!));

      this.txState = 'pending';
      this.txMessage = 'Transaction pending on Ethereum…';
      const receipt = await tx.wait();

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/loans/${this.data.id}/liquidate`, {
          transactionHash: receipt.hash,
        })
      );

      this.txState = 'success';
      this.txMessage = 'Collateral liquidated — NFT transferred to your wallet.';
      setTimeout(() => this.dialogRef.close({ status: 'LIQUIDATED', loanId: this.data.id }), 1200);
    } catch (error: any) {
      this.txState = 'error';
      this.txMessage = error?.error?.detail ?? error?.error?.message ?? error?.message ?? 'Liquidation failed';
    }
  }
}

@Component({
  selector: 'app-investor-investments',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    SharedModule,
    LiquidateConfirmDialogComponent,
  ],
  template: `
    <div class="investments-shell">
      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="No funded loans yet. Fund a loan from the Marketplace tab."
        [errorText]="errorMessage"
        (retry)="loadInvestments()"
      ></app-loading-or-empty>

      <table mat-table [dataSource]="dataSource" matSort class="investments-table" *ngIf="loadingState === 'loaded'">

        <ng-container matColumnDef="pme">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>PME</th>
          <td mat-cell *matCellDef="let loan">{{ loan.smeName }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount funded</th>
          <td mat-cell *matCellDef="let loan">{{ loan.amount | number:'1.2-2' }} ETH</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let loan">
            <div class="status-cell">
              <app-status-badge [status]="loan.status"></app-status-badge>
              <span class="overdue-pill" *ngIf="isOverdue(loan)">OVERDUE</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
          <td mat-cell *matCellDef="let loan">{{ loan.date }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let loan">
            <button
              mat-stroked-button
              color="warn"
              *ngIf="isOverdue(loan)"
              (click)="openLiquidateDialog(loan)">
              Liquidate
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <mat-paginator
        *ngIf="loadingState === 'loaded'"
        [pageSize]="10"
        [pageSizeOptions]="[5, 10, 25]"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [
    `
      .investments-shell {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .investments-table { width: 100%; }

      .status-cell {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .overdue-pill {
        background: var(--color-danger-bg);
        color: var(--color-danger);
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
      }
    `,
  ],
})
export class InvestorInvestmentsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  displayedColumns = ['pme', 'amount', 'status', 'date', 'actions'];
  dataSource = new MatTableDataSource<InvestmentLoan>([]);
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadInvestments();
  }

  ngAfterViewInit(): void {
    if (this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort) this.dataSource.sort = this.sort;
  }

  loadInvestments(): void {
    this.loadingState = 'loading';
    this.http.get<InvestmentLoan[]>(`${environment.apiUrl}/loans/portfolio`).subscribe({
      next: (investments) => {
        this.dataSource.data = investments;
        this.loadingState = investments.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.dataSource.data = [];
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load investments. Please try again.';
      },
    });
  }

  isOverdue(loan: InvestmentLoan): boolean {
    return loan.status === 'FUNDED' && !!loan.dueDate && new Date(loan.dueDate) < new Date();
  }

  openLiquidateDialog(loan: InvestmentLoan): void {
    const dialogRef = this.dialog.open(LiquidateConfirmDialogComponent, {
      width: '480px',
      data: loan,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.status === 'LIQUIDATED') {
        this.dataSource.data = this.dataSource.data.map((l) =>
          l.id === result.loanId ? { ...l, status: 'LIQUIDATED' } : l
        );
        this.snackBar.open('Collateral liquidated successfully', 'Close', { duration: 3000 });
      }
    });
  }
}
