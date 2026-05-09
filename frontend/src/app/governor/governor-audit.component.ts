import { Component, inject, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { environment } from '../../environments/environment';

interface AuditEvent {
  id: string;
  eventType: string;
  actorWallet: string;
  details: string;
  txHash: string;
  timestamp: string;
}

@Component({
  selector: 'app-governor-audit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="audit-shell">
      <div class="header-row">
        <div>
          <h1>Audit log</h1>
        </div>
        <form [formGroup]="filterForm" class="filter-row">
          <mat-form-field appearance="outline">
            <mat-label>Event type</mat-label>
            <mat-select formControlName="eventType">
              <mat-option value="">All</mat-option>
              <mat-option *ngFor="let type of eventTypes" [value]="type">{{ type }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Range</mat-label>
            <mat-date-range-input [rangePicker]="picker">
              <input matStartDate placeholder="Start" formControlName="start" />
              <input matEndDate placeholder="End" formControlName="end" />
            </mat-date-range-input>
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-date-range-picker #picker></mat-date-range-picker>
          </mat-form-field>
          <button mat-raised-button color="primary" type="button" (click)="applyFilters()">Filter</button>
        </form>
      </div>

      <mat-card>
        <table mat-table [dataSource]="dataSource" matSort class="mat-elevation-z0">
          <ng-container matColumnDef="eventType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Event type</th>
            <td mat-cell *matCellDef="let item"><span class="event-badge" [ngClass]="badgeClass(item.eventType)">{{ item.eventType }}</span></td>
          </ng-container>
          <ng-container matColumnDef="actorWallet">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Actor wallet</th>
            <td mat-cell *matCellDef="let item"><span class="monospace">{{ truncate(item.actorWallet) }}</span></td>
          </ng-container>
          <ng-container matColumnDef="details">
            <th mat-header-cell *matHeaderCellDef>Details</th>
            <td mat-cell *matCellDef="let item">{{ item.details }}</td>
          </ng-container>
          <ng-container matColumnDef="txHash">
            <th mat-header-cell *matHeaderCellDef>Tx hash</th>
            <td mat-cell *matCellDef="let item">
              <a [href]="buildTxLink(item.txHash)" target="_blank" rel="noopener" class="monospace link-cell">
                {{ truncate(item.txHash) }} <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">open_in_new</mat-icon>
              </a>
            </td>
          </ng-container>
          <ng-container matColumnDef="timestamp">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Timestamp</th>
            <td mat-cell *matCellDef="let item">{{ item.timestamp | date:'medium' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[20]" [pageSize]="20" showFirstLastButtons></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .audit-shell {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-5);
    }
    .header-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--space-4);
    }
    .header-row h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }
    .filter-row {
      display: flex;
      gap: var(--space-4);
      align-items: center;
      flex-wrap: wrap;
    }
    .event-badge {
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }

    .event-badge-user-registered   { background: var(--color-primary-bg);  color: var(--color-primary); }
    .event-badge-user-revoked      { background: var(--color-danger-bg);   color: var(--color-danger); }
    .event-badge-asset-tokenized   { background: var(--color-governor-bg); color: var(--color-governor); }
    .event-badge-loan-funded       { background: var(--color-success-bg);  color: var(--color-success); }
    .event-badge-loan-repaid       { background: var(--color-success-bg);  color: var(--color-success); }
    .event-badge-loan-defaulted    { background: var(--color-danger-bg);   color: var(--color-danger); }
    .monospace {
      font-family: monospace, monospace;
      font-size: var(--font-size-xs);
    }
    .link-cell {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      text-decoration: none;
      color: var(--color-primary);
    }
    mat-card {
      padding: 0 !important;
    }
  `],
})
export class GovernorAuditComponent implements OnInit, AfterViewInit {
  eventTypes = ['USER_REGISTERED', 'USER_REVOKED', 'ASSET_TOKENIZED', 'LOAN_FUNDED', 'LOAN_REPAID', 'LOAN_DEFAULTED'];
  columns = ['eventType', 'actorWallet', 'details', 'txHash', 'timestamp'];
  dataSource = new MatTableDataSource<AuditEvent>([]);
  filterForm = inject(FormBuilder).group({
    eventType: [''],
    start: [null],
    end: [null],
  });

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadAudit();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  buildTxLink(hash: string): string {
    return `https://etherscan.io/tx/${hash}`;
  }

  truncate(value: string): string {
    return value?.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  }

  badgeClass(eventType: string): string {
    return `event-badge-${eventType.toLowerCase().replace(/_/g, '-')}`;
  }

  applyFilters(): void {
    const { eventType, start, end } = this.filterForm.value;
    const params: any = {};
    if (eventType) params.eventType = eventType;
    if (start) params.start = new Date(start).toISOString();
    if (end) params.end = new Date(end).toISOString();
    this.http.get<AuditEvent[]>(`${environment.apiUrl}/governor/audit`, { params }).subscribe({
      next: (events) => {
        this.dataSource.data = events;
      },
      error: () => {
        this.dataSource.data = [];
      },
    });
  }

  private loadAudit(): void {
    this.http.get<AuditEvent[]>(`${environment.apiUrl}/governor/audit`).subscribe({
      next: (events) => {
        this.dataSource.data = events;
      },
      error: () => {
        this.dataSource.data = [];
      },
    });
  }
}
