import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { AddAssetDialogComponent } from './add-asset-dialog.component';
import { EditAssetDialogComponent } from './edit-asset-dialog.component';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog.component';
import { TokenizeAssetDialogComponent } from './tokenize-asset-dialog.component';
import { SharedModule } from '../shared/shared.module';

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  estimatedValue: number;
  status: 'REGISTERED' | 'ATO' | 'COLLATERAL';
}

@Component({
  selector: 'app-pme-assets',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    SharedModule,
  ],
  template: `
    <div class="assets-container">
      <section class="assets-header">
        <div>
          <h2>My assets</h2>
          <p class="subtitle">Track your company assets, tokenization status and collateral usage.</p>
        </div>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          Add asset
        </button>
      </section>

      <app-empty-state
        *ngIf="dataSource.data.length === 0"
        icon="ti-box"
        title="No assets yet"
        subtitle="Add your first asset to start tokenizing and financing."
        buttonLabel="Add your first asset"
        (buttonClick)="openAddDialog()"
      ></app-empty-state>

      <div *ngIf="dataSource.data.length > 0">
        <table mat-table [dataSource]="dataSource" matSort class="assets-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Asset name</th>
            <td mat-cell *matCellDef="let asset">{{ asset.name }}</td>
          </ng-container>

          <ng-container matColumnDef="assetType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
            <td mat-cell *matCellDef="let asset">{{ asset.assetType }}</td>
          </ng-container>

          <ng-container matColumnDef="estimatedValue">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Estimated value</th>
            <td mat-cell *matCellDef="let asset">{{ asset.estimatedValue | number:'1.2-2' }} ETH</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let asset">
              <app-status-badge [status]="asset.status"></app-status-badge>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let asset">
              <div class="actions-cell" [class.row-in-use]="asset.status === 'COLLATERAL'">
                <button
                  mat-stroked-button
                  color="primary"
                  *ngIf="asset.status === 'REGISTERED'"
                  (click)="openTokenizeDialog(asset)"
                >
                  Tokenize
                </button>
                <button
                  mat-stroked-button
                  color="primary"
                  *ngIf="asset.status === 'ATO'"
                  (click)="openEditDialog(asset)"
                >
                  Use as collateral
                </button>
                <button mat-icon-button aria-label="Edit" (click)="openEditDialog(asset)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button aria-label="Delete" color="warn" *ngIf="asset.status !== 'COLLATERAL'" (click)="openDeleteDialog(asset)">
                  <mat-icon>delete</mat-icon>
                </button>
                <span class="in-use-label" *ngIf="asset.status === 'COLLATERAL'">In use</span>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns" [class.collateral-row]="row.status === 'COLLATERAL'"></tr>
        </table>

        <mat-paginator [pageSize]="10" showFirstLastButtons></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .assets-container {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-5);
      }

      .assets-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
      }

      .assets-header h2 {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .subtitle {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
        margin-top: var(--space-1);
      }

      .assets-table {
        width: 100%;
        border-collapse: collapse;
      }

      .actions-cell {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
      }

      .in-use-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        font-weight: var(--font-weight-medium);
      }

      .collateral-row {
        opacity: 0.55;
      }

    `,
  ],
})
export class PmeAssetsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  displayedColumns: string[] = ['name', 'assetType', 'estimatedValue', 'status', 'actions'];
  dataSource = new MatTableDataSource<Asset>([]);

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadAssets();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  loadAssets(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) {
      return;
    }

    this.http.get<Asset[]>(`${environment.apiUrl}/assets?pmeWallet=${wallet}`).subscribe({
      next: (assets) => {
        this.dataSource.data = assets;
      },
      error: () => {
        this.dataSource.data = [];
        this.snackBar.open('Failed to load assets', 'Close', { duration: 3000 });
      },
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AddAssetDialogComponent, {
      width: '480px',
      panelClass: 'asset-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const wallet = this.authService.currentUser?.walletAddress;
        this.http.post<Asset>(`${environment.apiUrl}/assets`, { ...result, pmeWallet: wallet }).subscribe({
          next: () => {
            this.loadAssets();
            this.snackBar.open('Asset added successfully', 'Close', { duration: 3000 });
          },
          error: () => this.snackBar.open('Failed to add asset', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  openEditDialog(asset: Asset): void {
    const dialogRef = this.dialog.open(EditAssetDialogComponent, {
      width: '480px',
      data: asset,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.http.put(`${environment.apiUrl}/assets/${asset.id}`, result).subscribe({
          next: () => {
            this.loadAssets();
            this.snackBar.open('Asset updated successfully', 'Close', { duration: 3000 });
          },
          error: () => this.snackBar.open('Failed to update asset', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  openDeleteDialog(asset: Asset): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '320px',
      height: '160px',
      data: asset,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.http.delete(`${environment.apiUrl}/assets/${asset.id}`).subscribe({
          next: () => {
            this.loadAssets();
            this.snackBar.open('Asset deleted successfully', 'Close', { duration: 3000 });
          },
          error: () => this.snackBar.open('Failed to delete asset', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  openTokenizeDialog(asset: Asset): void {
    const dialogRef = this.dialog.open(TokenizeAssetDialogComponent, {
      width: '480px',
      data: asset,
      panelClass: 'asset-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.status === 'ATO') {
        this.dataSource.data = this.dataSource.data.map((row) =>
          row.id === result.assetId ? { ...row, status: 'ATO' } : row
        );
        this.snackBar.open('Asset tokenized successfully', 'Close', { duration: 3000 });
      }
    });
  }
}