import { Component, inject, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';
import { WalletService } from '../auth/wallet.service';

interface AccessUser {
  id: string;
  fullName: string;
  walletAddress: string;
  role: string;
  status: string;
  approvedAt: string;
}

@Component({
  selector: 'app-governor-access',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    SharedModule,
  ],
  template: `
    <div class="access-shell">
      <div class="access-header">
        <h1>Access rights</h1>
        <mat-form-field class="search-field" appearance="outline">
          <mat-label>Search by wallet or name</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Search..." />
        </mat-form-field>
      </div>

      <mat-card>
        <table mat-table [dataSource]="dataSource" class="mat-elevation-z0">
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let item">
              <div class="user-cell">
                <div class="avatar">{{ initials(item.fullName) }}</div>
                <div>
                  <div class="name">{{ item.fullName }}</div>
                  <div class="wallet monospace">{{ item.walletAddress }}</div>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let item"><app-role-badge [role]="item.role"></app-role-badge></td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let item"><app-status-badge [status]="item.status"></app-status-badge></td>
          </ng-container>

          <ng-container matColumnDef="approvedAt">
            <th mat-header-cell *matHeaderCellDef>Approved date</th>
            <td mat-cell *matCellDef="let item">{{ item.approvedAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let item">
              <button mat-icon-button color="warn" matTooltip="Revoke access" (click)="openRevokeDialog(item)">
                <span class="ti-user-x"></span>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[10,20,50]" showFirstLastButtons></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .access-shell {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-5);
    }
    .access-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
    }
    .access-header h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }
    .search-field {
      width: min(320px, 100%);
    }
    mat-card {
      padding: 0 !important;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--color-governor-bg);
      color: var(--color-governor);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      flex-shrink: 0;
    }
    .wallet {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      font-family: monospace;
    }
    .monospace {
      font-family: monospace, monospace;
      font-size: var(--font-size-xs);
    }
  `],
})
export class GovernorAccessComponent implements OnInit, AfterViewInit {
  columns = ['user', 'role', 'status', 'approvedAt', 'actions'];
  dataSource = new MatTableDataSource<AccessUser>([]);
  searchControl = new FormControl('');

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadUsers();
    this.searchControl.valueChanges.subscribe((value) => {
      this.dataSource.filter = value?.trim().toLowerCase() || '';
    });
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  loadUsers(): void {
    this.http.get<AccessUser[]>(`${environment.apiUrl}/governor/access`).subscribe({
      next: (users) => {
        this.dataSource.data = users;
        this.dataSource.filterPredicate = (data: AccessUser, filter: string) =>
          data.fullName.toLowerCase().includes(filter) || data.walletAddress.toLowerCase().includes(filter);
      },
      error: () => {
        this.dataSource.data = [];
      },
    });
  }

  initials(fullName: string): string {
    return fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  openRevokeDialog(user: AccessUser): void {
    const dialogRef = this.dialog.open(RevokeAccessDialog, {
      width: '420px',
      data: user,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.revoked) {
        this.dataSource.data = this.dataSource.data.filter((item) => item.id !== user.id);
      }
    });
  }
}

@Component({
  selector: 'revoke-access-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatSnackBarModule, SharedModule],
  template: `
    <h2 mat-dialog-title>Revoke access</h2>
    <mat-dialog-content>
      <p>Revoke access for <strong>{{ data.fullName }}</strong>?</p>
      <div *ngIf="txState !== 'idle'" class="tx-feedback-row">
        <app-tx-feedback [state]="txState" [message]="txMessage"></app-tx-feedback>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" (click)="confirmRevoke()" [disabled]="txState === 'pending'">Revoke</button>
    </mat-dialog-actions>
  `,
  styles: [`.tx-feedback-row { margin-top: var(--space-4); }`],
})
export class RevokeAccessDialog {
  data!: AccessUser;
  txState: 'idle' | 'pending' | 'success' | 'error' = 'idle';
  txMessage = '';

  private dialogRef = inject(MatDialogRef<RevokeAccessDialog>);
  private snackBar = inject(MatSnackBar);
  private walletService = inject(WalletService);
  private http = inject(HttpClient);

  confirmRevoke(): void {
    this.txState = 'pending';
    this.txMessage = 'Sending revoke transaction...';
    this.walletService.sendEth(environment.contractAddress, '0.001').then((txHash) => {
      this.txState = 'success';
      this.txMessage = `Revoked on-chain: ${txHash}`;
      this.http.post(`${environment.apiUrl}/governor/access/${this.data.id}/revoke`, { txHash }).subscribe(() => {
        this.dialogRef.close({ revoked: true });
      });
    }).catch(() => {
      this.txState = 'error';
      this.txMessage = 'Revoke transaction failed.';
    });
  }
}