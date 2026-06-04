import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';
import { PaginatedResult } from '../shared/models/paginated-result';

interface UserItem {
  id: string;
  walletAddress: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  companyName: string | null;
}

@Component({
  selector: 'app-governor-access',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    SharedModule,
  ],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h2>User Management</h2>
          <p class="subtitle">View, filter, and manage all platform users.</p>
        </div>
      </div>

      <div class="filters-bar">
        <mat-form-field appearance="outline" class="role-filter">
          <mat-label>Role</mat-label>
          <mat-select [formControl]="roleControl">
            <mat-option value="">All Roles</mat-option>
            <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search by wallet address</mat-label>
          <input matInput [formControl]="searchControl" placeholder="0x..." />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="No users found."
        [errorText]="errorMessage"
        (retry)="loadUsers()"
      ></app-loading-or-empty>

      <mat-card *ngIf="loadingState === 'loaded'" class="table-card">
        <table mat-table [dataSource]="users" class="users-table">

          <ng-container matColumnDef="walletAddress">
            <th mat-header-cell *matHeaderCellDef>Wallet Address</th>
            <td mat-cell *matCellDef="let u" class="mono">
              {{ u.walletAddress | slice:0:10 }}&hellip;{{ u.walletAddress | slice:-6 }}
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let u">
              <app-role-badge [role]="u.role"></app-role-badge>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let u">
              <app-status-badge [status]="u.isApproved ? 'APPROVED' : 'PENDING'"></app-status-badge>
            </td>
          </ng-container>

          <ng-container matColumnDef="companyName">
            <th mat-header-cell *matHeaderCellDef>Company / Name</th>
            <td mat-cell *matCellDef="let u">{{ u.companyName ?? '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="joinedAt">
            <th mat-header-cell *matHeaderCellDef>Joined</th>
            <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let u">
              <button mat-icon-button color="warn"
                [disabled]="u.role === 'GOVERNOR'"
                matTooltip="Delete user"
                (click)="openDeleteDialog(u)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>

        <mat-paginator
          [length]="totalCount"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          [pageIndex]="page - 1"
          (page)="onPageChange($event)"
          showFirstLastButtons>
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); margin-top: var(--space-1); font-size: var(--font-size-base); }
    .filters-bar { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-start; }
    .role-filter { width: 180px; }
    .search-field { width: min(320px, 100%); flex: 1; }
    mat-card { padding: 0 !important; }
    .users-table { width: 100%; }
    .mono { font-family: monospace, monospace; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
  `],
})
export class GovernorAccessComponent implements OnInit {
  columns = ['walletAddress', 'role', 'status', 'companyName', 'joinedAt', 'actions'];
  roles = ['PME', 'INVESTOR', 'GUARANTOR', 'GOVERNOR'];

  users: UserItem[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 20;
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';

  roleControl = new FormControl('');
  searchControl = new FormControl('');

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadUsers();
    this.roleControl.valueChanges.subscribe(() => this.applyFilters());
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.applyFilters());
  }

  applyFilters(): void {
    this.page = 1;
    this.loadUsers();
  }

  loadUsers(): void {
    this.loadingState = 'loading';
    const params: Record<string, string | number> = { page: this.page, pageSize: this.pageSize };
    if (this.roleControl.value) params['role'] = this.roleControl.value;
    if (this.searchControl.value?.trim()) params['search'] = this.searchControl.value.trim();

    this.http.get<PaginatedResult<UserItem>>(`${environment.apiUrl}/admin/users`, { params }).subscribe({
      next: (result) => {
        this.users = result.items;
        this.totalCount = result.totalCount;
        this.loadingState = result.items.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load users. Please try again.';
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  openDeleteDialog(user: UserItem): void {
    const dialogRef = this.dialog.open(DeleteUserDialog, { width: '400px', data: user });
    dialogRef.afterClosed().subscribe((deleted: boolean) => {
      if (deleted) {
        this.users = this.users.filter(u => u.id !== user.id);
        this.totalCount--;
        if (this.users.length === 0) this.loadingState = 'empty';
      }
    });
  }
}

@Component({
  selector: 'app-delete-user-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Delete user</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete this user?</p>
      <p class="wallet">{{ data.walletAddress }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" (click)="confirmDelete()" [disabled]="deleting">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [`.wallet { font-family: monospace; font-size: 0.85em; color: var(--color-text-muted); word-break: break-all; }`],
})
export class DeleteUserDialog {
  data = inject<UserItem>(MAT_DIALOG_DATA);
  deleting = false;

  private dialogRef = inject(MatDialogRef<DeleteUserDialog>);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  confirmDelete(): void {
    this.deleting = true;
    this.http.delete(`${environment.apiUrl}/admin/users/${this.data.id}`).subscribe({
      next: () => {
        this.snackBar.open('User deleted', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.deleting = false;
        this.snackBar.open('Failed to delete user', 'Close', { duration: 3000 });
      },
    });
  }
}
