import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';

interface PendingUser {
  userId: string;
  walletAddress: string;
  role: string;
  profileData: Record<string, string>;
  createdAt: string;
}

@Component({
  selector: 'app-governor-registrations',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, MatChipsModule, MatDividerModule, MatProgressSpinnerModule, SharedModule,
  ],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h2>Registration requests</h2>
          <p class="subtitle">Review and approve or reject new user registrations.</p>
        </div>
        <div class="count-pill" *ngIf="pendingUsers.length > 0">
          {{ pendingUsers.length }} pending
        </div>
      </div>

      <app-empty-state
        *ngIf="pendingUsers.length === 0 && !loading"
        icon="group"
        title="No pending registrations"
        subtitle="All registrations have been reviewed."
      ></app-empty-state>

      <div *ngIf="loading" class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <table mat-table [dataSource]="pendingUsers" *ngIf="pendingUsers.length > 0" class="users-table">
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>User</th>
          <td mat-cell *matCellDef="let u">
            <div class="user-cell">
              <div class="avatar">{{ initials(u) }}</div>
              <div>
                <div class="name">{{ displayName(u) }}</div>
                <div class="wallet">{{ u.walletAddress | slice:0:10 }}...{{ u.walletAddress | slice:-6 }}</div>
              </div>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Role</th>
          <td mat-cell *matCellDef="let u"><app-role-badge [role]="u.role"></app-role-badge></td>
        </ng-container>

        <ng-container matColumnDef="info">
          <th mat-header-cell *matHeaderCellDef>Info</th>
          <td mat-cell *matCellDef="let u" class="info-cell">
            <span *ngIf="u.profileData?.email">{{ u.profileData.email }}</span>
            <span *ngIf="u.profileData?.sector" class="muted"> · {{ u.profileData.sector }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="submitted">
          <th mat-header-cell *matHeaderCellDef>Submitted</th>
          <td mat-cell *matCellDef="let u" class="muted">{{ u.createdAt | date:'mediumDate' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let u">
            <div class="action-group">
              <button mat-raised-button color="primary" (click)="approve(u)">Approve</button>
              <button mat-stroked-button color="warn" (click)="reject(u)">Reject</button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>
  `,
  styles: [`
    .page-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }
    .page-header h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); margin-top: var(--space-1); font-size: var(--font-size-base); }
    .count-pill { background: var(--color-warning-bg); color: var(--color-warning); padding: var(--space-2) var(--space-3); border-radius: var(--radius-pill); font-weight: var(--font-weight-medium); font-size: var(--font-size-base); white-space: nowrap; }
    .loading-center { display: flex; justify-content: center; padding: var(--space-7); }
    .users-table { width: 100%; }
    .user-cell { display: flex; align-items: center; gap: var(--space-3); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary-bg); color: var(--color-primary); display: grid; place-items: center; font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); flex-shrink: 0; }
    .name { font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .wallet { font-size: var(--font-size-sm); color: var(--color-text-muted); font-family: monospace; }
    .info-cell { font-size: var(--font-size-base); color: var(--color-text-secondary); }
    .muted { color: var(--color-text-muted); }
    .action-group { display: flex; gap: var(--space-2); }
  `],
})
export class GovernorRegistrationsComponent implements OnInit {
  pendingUsers: PendingUser[] = [];
  loading = false;
  columns = ['user', 'role', 'info', 'submitted', 'actions'];

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<PendingUser[]>(`${environment.apiUrl}/admin/users/pending`).subscribe({
      next: (users) => { this.pendingUsers = users; this.loading = false; },
      error: () => { this.loading = false; this.snackBar.open('Failed to load registrations', 'Close', { duration: 3000 }); },
    });
  }

  approve(user: PendingUser): void {
    this.http.post(`${environment.apiUrl}/admin/users/${user.userId}/approve`, {}).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u.userId !== user.userId);
        this.snackBar.open(`${this.displayName(user)} approved successfully`, 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Approval failed', 'Close', { duration: 3000 }),
    });
  }

  reject(user: PendingUser): void {
    this.http.delete(`${environment.apiUrl}/admin/users/${user.userId}/reject`).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u.userId !== user.userId);
        this.snackBar.open(`${this.displayName(user)} rejected`, 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Rejection failed', 'Close', { duration: 3000 }),
    });
  }

  displayName(u: PendingUser): string {
    return u.profileData?.['companyName'] || u.profileData?.['fullName'] || u.walletAddress.slice(0, 10) + '...';
  }

  initials(u: PendingUser): string {
    const name = this.displayName(u);
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
}
