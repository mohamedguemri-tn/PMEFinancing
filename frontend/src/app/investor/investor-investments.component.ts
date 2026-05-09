import { Component, AfterViewInit, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';

interface InvestmentLoan {
  id: string;
  smeName: string;
  amount: number;
  collateralAssetName: string;
  status: 'FUNDED' | 'REPAID' | 'DEFAULTED';
  fundedDate: string;
  fundedAmount: number;
  repaidAmount: number;
  txHash: string;
  tokenId: string;
}

@Component({
  selector: 'app-investor-investments',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatExpansionModule, MatProgressBarModule, MatIconModule, MatCardModule, MatButtonModule, SharedModule],
  template: `
    <div class="investments-shell">
      <table mat-table [dataSource]="dataSource" class="investments-table">

        <ng-container matColumnDef="pme">
          <th mat-header-cell *matHeaderCellDef>PME</th>
          <td mat-cell *matCellDef="let loan">{{ loan.smeName }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Amount funded</th>
          <td mat-cell *matCellDef="let loan">{{ loan.amount | number:'1.2-2' }} ETH</td>
        </ng-container>

        <ng-container matColumnDef="collateral">
          <th mat-header-cell *matHeaderCellDef>Collateral</th>
          <td mat-cell *matCellDef="let loan">{{ loan.collateralAssetName }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let loan">
            <app-status-badge [status]="loan.status"></app-status-badge>
          </td>
        </ng-container>

        <ng-container matColumnDef="fundedDate">
          <th mat-header-cell *matHeaderCellDef>Funded date</th>
          <td mat-cell *matCellDef="let loan">{{ loan.fundedDate | date:'mediumDate' }}</td>
        </ng-container>

        <ng-container matColumnDef="progress">
          <th mat-header-cell *matHeaderCellDef>Repayment progress</th>
          <td mat-cell *matCellDef="let loan">
            <mat-progress-bar mode="determinate" [value]="getProgress(loan)"></mat-progress-bar>
            <div class="progress-text">{{ loan.repaidAmount | number:'1.2-2' }} ETH of {{ loan.fundedAmount | number:'1.2-2' }} ETH repaid</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let loan">
            <button mat-icon-button (click)="toggleExpansion(loan.id)">
              <mat-icon>{{ expandedLoanId === loan.id ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="data-row"></tr>
        <tr mat-row *matRowDef="let row; columns: ['detail']" class="detail-row">
          <td mat-cell [attr.colspan]="displayedColumns.length">
            <mat-expansion-panel [expanded]="expandedLoanId === row.id" hideToggle>
              <mat-expansion-panel-header>
                <mat-panel-title>Transaction details</mat-panel-title>
              </mat-expansion-panel-header>
              <div class="detail-content">
                <div><strong>Tx hash</strong></div>
                <div class="hash">{{ row.txHash }}</div>
                <div><strong>Token ID</strong></div>
                <div>{{ row.tokenId }}</div>
                <a class="blockchain-link" href="https://etherscan.io/tx/{{ row.txHash }}" target="_blank" rel="noopener noreferrer">
                  View on chain <mat-icon>ti-external-link</mat-icon>
                </a>
              </div>
            </mat-expansion-panel>
          </td>
        </tr>
      </table>
    </div>
  `,
  styles: [
    `
      .investments-shell {
        padding: var(--space-5);
      }

      .investments-table { width: 100%; }

      .progress-text {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin-top: var(--space-1);
      }

      .detail-row { background: var(--color-surface); }

      .detail-content {
        display: grid;
        gap: var(--space-3);
        padding: var(--space-4) 0;
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
      }

      .hash {
        font-family: monospace;
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        word-break: break-all;
      }

      .blockchain-link {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        color: var(--color-primary);
        text-decoration: none;
        font-size: var(--font-size-base);
      }
    `,
  ],
})
export class InvestorInvestmentsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  displayedColumns = ['pme', 'amount', 'collateral', 'status', 'fundedDate', 'progress', 'actions'];
  dataSource = new MatTableDataSource<InvestmentLoan>([]);
  expandedLoanId: string | null = null;

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadInvestments();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  private loadInvestments(): void {
    this.http.get<InvestmentLoan[]>(`${environment.apiUrl}/investor/investments`).subscribe({
      next: (investments) => (this.dataSource.data = investments),
      error: () => {
        this.dataSource.data = [];
      },
    });
  }

  getProgress(loan: InvestmentLoan): number {
    if (!loan.fundedAmount) {
      return 0;
    }
    return Math.min(100, ((loan.repaidAmount || 0) / loan.fundedAmount) * 100);
  }

  toggleExpansion(id: string): void {
    this.expandedLoanId = this.expandedLoanId === id ? null : id;
  }
}
