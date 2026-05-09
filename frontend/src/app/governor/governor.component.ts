import { Component, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';

export interface PendingUser {
  id: string;
  walletAddress: string;
  requestedRole: string;
}

export interface User {
  id: string;
  walletAddress: string;
  role: string;
}

export interface PlatformParams {
  maxLoanAmount: number;
  interestRateMin: number;
  interestRateMax: number;
  collateralRatio: number;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  user: string;
  timestamp: string;
  details: string;
}

@Component({
  selector: 'app-governor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="governor-container">
      <h2>Governor Dashboard</h2>

      <mat-tab-group>
        <mat-tab label="Registration Requests">
          <div class="tab-content">
            <table mat-table [dataSource]="pendingUsersDataSource" matSort #pendingSort="matSort">
              <ng-container matColumnDef="walletAddress">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Wallet Address</th>
                <td mat-cell *matCellDef="let user">{{ user.walletAddress }}</td>
              </ng-container>
              <ng-container matColumnDef="requestedRole">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Requested Role</th>
                <td mat-cell *matCellDef="let user">{{ user.requestedRole }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-button color="primary" (click)="approveUser(user)">Approve</button>
                  <button mat-button color="warn" (click)="rejectUser(user)">Reject</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="pendingUsersColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: pendingUsersColumns"></tr>
            </table>
            <mat-paginator #pendingPaginator="matPaginator" [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
          </div>
        </mat-tab>

        <mat-tab label="Access Rights">
          <div class="tab-content">
            <mat-form-field>
              <mat-label>Search Users</mat-label>
              <input matInput (keyup)="applyUserFilter($event)" placeholder="Filter by wallet or role">
            </mat-form-field>
            <table mat-table [dataSource]="usersDataSource" matSort #usersSort="matSort">
              <ng-container matColumnDef="walletAddress">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Wallet Address</th>
                <td mat-cell *matCellDef="let user">{{ user.walletAddress }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip [color]="getRoleColor(user.role)" selected>{{ user.role }}</mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  <button mat-button color="warn" (click)="revokeUser(user)">Revoke</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="usersColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: usersColumns"></tr>
            </table>
            <mat-paginator #usersPaginator="matPaginator" [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
          </div>
        </mat-tab>

        <mat-tab label="Platform Parameters">
          <div class="tab-content">
            <form [formGroup]="paramsForm" (ngSubmit)="saveParams()">
              <mat-form-field>
                <mat-label>Max Loan Amount</mat-label>
                <input matInput type="number" formControlName="maxLoanAmount">
              </mat-form-field>
              <mat-form-field>
                <mat-label>Min Interest Rate (%)</mat-label>
                <input matInput type="number" step="0.01" formControlName="interestRateMin">
              </mat-form-field>
              <mat-form-field>
                <mat-label>Max Interest Rate (%)</mat-label>
                <input matInput type="number" step="0.01" formControlName="interestRateMax">
              </mat-form-field>
              <mat-form-field>
                <mat-label>Collateral Ratio (%)</mat-label>
                <input matInput type="number" step="0.01" formControlName="collateralRatio">
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="paramsForm.invalid">Save</button>
            </form>
          </div>
        </mat-tab>
      </mat-tab-group>

      <h3>Audit Log</h3>
      <table mat-table [dataSource]="auditDataSource" matSort #auditSort="matSort">
        <ng-container matColumnDef="eventType">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Event Type</th>
          <td mat-cell *matCellDef="let event">{{ event.eventType }}</td>
        </ng-container>
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>User</th>
          <td mat-cell *matCellDef="let event">{{ event.user }}</td>
        </ng-container>
        <ng-container matColumnDef="timestamp">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Timestamp</th>
          <td mat-cell *matCellDef="let event">{{ event.timestamp | date:'short' }}</td>
        </ng-container>
        <ng-container matColumnDef="details">
          <th mat-header-cell *matHeaderCellDef>Details</th>
          <td mat-cell *matCellDef="let event">{{ event.details }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="auditColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: auditColumns"></tr>
      </table>
      <mat-paginator #auditPaginator="matPaginator" [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
    </div>
  `,
  styles: [
    `
      .governor-container {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-5);
      }

      .governor-container h2 {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .governor-container h3 {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
        margin-top: var(--space-5);
        margin-bottom: var(--space-3);
      }

      .tab-content {
        padding-top: var(--space-4);
        display: grid;
        gap: var(--space-4);
      }

      table {
        width: 100%;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        max-width: 400px;
      }

      mat-chip {
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .action-btn-group {
        display: flex;
        gap: var(--space-2);
      }
    `,
  ],
})
export class GovernorComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  pendingUsersColumns: string[] = ['walletAddress', 'requestedRole', 'actions'];
  usersColumns: string[] = ['walletAddress', 'role', 'actions'];
  auditColumns: string[] = ['eventType', 'user', 'timestamp', 'details'];

  pendingUsersDataSource = new MatTableDataSource<PendingUser>();
  usersDataSource = new MatTableDataSource<User>();
  auditDataSource = new MatTableDataSource<AuditEvent>();

  @ViewChild('pendingPaginator') pendingPaginator!: MatPaginator;
  @ViewChild('pendingSort') pendingSort!: MatSort;
  @ViewChild('usersPaginator') usersPaginator!: MatPaginator;
  @ViewChild('usersSort') usersSort!: MatSort;
  @ViewChild('auditPaginator') auditPaginator!: MatPaginator;
  @ViewChild('auditSort') auditSort!: MatSort;

  paramsForm: FormGroup;

  constructor() {
    this.paramsForm = this.fb.group({
      maxLoanAmount: [0, Validators.required],
      interestRateMin: [0, Validators.required],
      interestRateMax: [0, Validators.required],
      collateralRatio: [0, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadPendingUsers();
    this.loadUsers();
    this.loadParams();
    this.loadAuditLog();
  }

  ngAfterViewInit(): void {
    this.pendingUsersDataSource.paginator = this.pendingPaginator;
    this.pendingUsersDataSource.sort = this.pendingSort;
    this.usersDataSource.paginator = this.usersPaginator;
    this.usersDataSource.sort = this.usersSort;
    this.auditDataSource.paginator = this.auditPaginator;
    this.auditDataSource.sort = this.auditSort;
  }

  loadPendingUsers(): void {
    this.http.get<PendingUser[]>(`${environment.apiUrl}/admin/users/pending`).subscribe({
      next: (users) => this.pendingUsersDataSource.data = users,
      error: () => this.snackBar.open('Failed to load pending users', 'Close', { duration: 3000 }),
    });
  }

  loadUsers(): void {
    this.http.get<User[]>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (users) => this.usersDataSource.data = users,
      error: () => this.snackBar.open('Failed to load users', 'Close', { duration: 3000 }),
    });
  }

  loadParams(): void {
    this.http.get<PlatformParams>(`${environment.apiUrl}/admin/params`).subscribe({
      next: (params) => this.paramsForm.patchValue(params),
      error: () => this.snackBar.open('Failed to load parameters', 'Close', { duration: 3000 }),
    });
  }

  loadAuditLog(): void {
    this.http.get<AuditEvent[]>(`${environment.apiUrl}/admin/events`).subscribe({
      next: (events) => this.auditDataSource.data = events,
      error: () => this.snackBar.open('Failed to load audit log', 'Close', { duration: 3000 }),
    });
  }

  approveUser(user: PendingUser): void {
    this.http.post(`${environment.apiUrl}/admin/users/${user.id}/approve`, {}).subscribe({
      next: () => {
        this.snackBar.open('User approved', 'Close', { duration: 3000 });
        this.loadPendingUsers();
        this.loadUsers();
        this.loadAuditLog();
      },
      error: () => this.snackBar.open('Failed to approve user', 'Close', { duration: 3000 }),
    });
  }

  rejectUser(user: PendingUser): void {
    this.http.delete(`${environment.apiUrl}/admin/users/${user.id}`).subscribe({
      next: () => {
        this.snackBar.open('User rejected', 'Close', { duration: 3000 });
        this.loadPendingUsers();
      },
      error: () => this.snackBar.open('Failed to reject user', 'Close', { duration: 3000 }),
    });
  }

  revokeUser(user: User): void {
    this.http.delete(`${environment.apiUrl}/admin/users/${user.id}/role`).subscribe({
      next: () => {
        this.snackBar.open('Role revoked', 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadAuditLog();
      },
      error: () => this.snackBar.open('Failed to revoke role', 'Close', { duration: 3000 }),
    });
  }

  saveParams(): void {
    if (this.paramsForm.valid) {
      this.http.put(`${environment.apiUrl}/admin/params`, this.paramsForm.value).subscribe({
        next: () => {
          this.snackBar.open('Parameters saved', 'Close', { duration: 3000 });
          this.loadAuditLog();
        },
        error: () => this.snackBar.open('Failed to save parameters', 'Close', { duration: 3000 }),
      });
    }
  }

  applyUserFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.usersDataSource.filter = filterValue.trim().toLowerCase();
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'PME': return 'primary';
      case 'INVESTOR': return 'accent';
      case 'GUARANTOR': return 'primary';
      case 'GOVERNOR': return 'warn';
      default: return '';
    }
  }
}
