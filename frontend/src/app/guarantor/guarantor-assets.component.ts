import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { PaginatedResult } from '../shared/models/paginated-result';
import { AddAssetDialogComponent } from '../pme/add-asset-dialog.component';
import { EditAssetDialogComponent } from '../pme/edit-asset-dialog.component';
import { ConfirmDeleteDialogComponent } from '../pme/confirm-delete-dialog.component';

interface Asset {
  id: string;
  name: string;
  assetType: string;
  estimatedValue: number;
  status: string;
}

@Component({
  selector: 'app-guarantor-assets',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, MatPaginatorModule,
    SharedModule,
  ],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h2>My assets</h2>
          <p class="subtitle">Register assets to offer as loan backing. Assets remain REGISTERED — no tokenization required.</p>
        </div>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon> Add asset
        </button>
      </div>

      <app-loading-or-empty
        *ngIf="loadingState !== 'loaded'"
        [state]="loadingState"
        emptyText="No assets yet. Add assets to offer as loan backing."
        [errorText]="errorMessage"
        (retry)="loadAssets()"
      ></app-loading-or-empty>

      <div *ngIf="loadingState === 'loaded'">
        <table mat-table [dataSource]="assets" class="assets-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Asset name</th>
            <td mat-cell *matCellDef="let a">{{ a.name }}</td>
          </ng-container>
          <ng-container matColumnDef="assetType">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let a">{{ a.assetType }}</td>
          </ng-container>
          <ng-container matColumnDef="estimatedValue">
            <th mat-header-cell *matHeaderCellDef>Estimated value</th>
            <td mat-cell *matCellDef="let a">{{ a.estimatedValue | number:'1.2-2' }} ETH</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let a"><app-status-badge [status]="a.status"></app-status-badge></td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let a">
              <div class="action-group">
                <button mat-icon-button (click)="openEditDialog(a)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn" (click)="openDeleteDialog(a)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        <mat-paginator
          [length]="totalCount"
          [pageSize]="pageSize"
          [pageSizeOptions]="[5, 10, 25]"
          [pageIndex]="currentPage - 1"
          (page)="onPageChange($event)"
          showFirstLastButtons>
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .page-shell { padding: var(--space-5); display: grid; gap: var(--space-5); }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }
    .page-header h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); margin-top: var(--space-1); font-size: var(--font-size-base); }
    .assets-table { width: 100%; }
    .action-group { display: flex; gap: var(--space-1); align-items: center; }
  `],
})
export class GuarantorAssetsComponent implements OnInit {
  assets: Asset[] = [];
  loadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  errorMessage = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  columns = ['name', 'assetType', 'estimatedValue', 'status', 'actions'];

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) return;
    this.loadingState = 'loading';
    this.http.get<PaginatedResult<Asset>>(`${environment.apiUrl}/assets`, {
      params: { pmeWallet: wallet, page: this.currentPage, pageSize: this.pageSize },
    }).subscribe({
      next: (r) => {
        this.assets = r.items;
        this.totalCount = r.totalCount;
        this.loadingState = r.items.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.loadingState = 'error';
        this.errorMessage = 'Failed to load assets. Please try again.';
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadAssets();
  }

  openAddDialog(): void {
    const ref = this.dialog.open(AddAssetDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.http.post(`${environment.apiUrl}/assets`, result).subscribe({
          next: () => { this.currentPage = 1; this.loadAssets(); this.snackBar.open('Asset added', 'Close', { duration: 3000 }); },
          error: () => this.snackBar.open('Failed to add asset', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  openEditDialog(asset: Asset): void {
    const ref = this.dialog.open(EditAssetDialogComponent, { width: '480px', data: asset });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.http.put(`${environment.apiUrl}/assets/${asset.id}`, result).subscribe({
          next: () => { this.loadAssets(); this.snackBar.open('Asset updated', 'Close', { duration: 3000 }); },
          error: () => this.snackBar.open('Failed to update asset', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  openDeleteDialog(asset: Asset): void {
    const ref = this.dialog.open(ConfirmDeleteDialogComponent, { width: '320px', height: '160px', data: asset });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.http.delete(`${environment.apiUrl}/assets/${asset.id}`).subscribe({
          next: () => { this.loadAssets(); this.snackBar.open('Asset deleted', 'Close', { duration: 3000 }); },
          error: () => this.snackBar.open('Failed to delete asset', 'Close', { duration: 3000 }),
        });
      }
    });
  }
}
