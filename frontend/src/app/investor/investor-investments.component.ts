import { Component, AfterViewInit, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';

interface InvestmentLoan {
  id: string;
  smeName: string;
  amount: number;
  date: string;
  status: string;
}

@Component({
  selector: 'app-investor-investments',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, SharedModule],
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
            <app-status-badge [status]="loan.status"></app-status-badge>
          </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
          <td mat-cell *matCellDef="let loan">{{ loan.date }}</td>
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
    `,
  ],
})
export class InvestorInvestmentsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  displayedColumns = ['pme', 'amount', 'status', 'date'];
  dataSource = new MatTableDataSource<InvestmentLoan>([]);
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';

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
}
