import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { WalletService } from '../auth/wallet.service';
import { environment } from '../../environments/environment';
import { AddAssetDialogComponent } from './add-asset-dialog.component';
import { EditAssetDialogComponent } from './edit-asset-dialog.component';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog.component';

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
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="assets-container">
      <h2>My Assets</h2>
      <button mat-raised-button color="primary" (click)="openAddDialog()">
        <mat-icon>add</mat-icon>
        Add Asset
      </button>

      <table mat-table [dataSource]="(assets$ | async) ?? []" class="assets-table">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let asset">{{ asset.name }}</td>
        </ng-container>

        <ng-container matColumnDef="assetType">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let asset">{{ asset.assetType }}</td>
        </ng-container>

        <ng-container matColumnDef="estimatedValue">
          <th mat-header-cell *matHeaderCellDef>Value</th>
          <td mat-cell *matCellDef="let asset">{{ asset.estimatedValue | currency }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let asset">
            <mat-chip [color]="getStatusColor(asset.status)" selected>
              {{ asset.status }}
            </mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let asset">
            <button mat-icon-button (click)="openEditDialog(asset)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="openDeleteDialog(asset)">
              <mat-icon>delete</mat-icon>
            </button>
            <button
              *ngIf="asset.status === 'REGISTERED'"
              mat-raised-button
              color="accent"
              (click)="tokenizeAsset(asset)"
              [disabled]="tokenizingAssets.has(asset.id)"
            >
              <mat-spinner *ngIf="tokenizingAssets.has(asset.id)" diameter="20"></mat-spinner>
              <span *ngIf="!tokenizingAssets.has(asset.id)">Tokenize</span>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    </div>
  `,
  styles: [
    `
      .assets-container {
        padding: 24px;
      }

      .assets-table {
        width: 100%;
        margin-top: 24px;
      }

      mat-chip {
        text-transform: uppercase;
      }
    `,
  ],
})
export class PmeAssetsComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private walletService = inject(WalletService);

  displayedColumns: string[] = ['name', 'assetType', 'estimatedValue', 'status', 'actions'];
  assets$ = new BehaviorSubject<Asset[]>([]);
  tokenizingAssets = new Set<string>();

  ngOnInit(): void {
  setTimeout(() => this.loadAssets(), 100);
}

  loadAssets(): void {
  const wallet = this.walletService.currentUser?.walletAddress;
  console.log('TOKEN AT LOAD TIME:', localStorage.getItem('auth_token'));
  this.http.get<Asset[]>(`${environment.apiUrl}/assets?pmeWallet=${wallet}`).subscribe({
    next: (assets) => this.assets$.next(assets),
    error: (error) => this.snackBar.open('Failed to load assets', 'Close', { duration: 3000 }),
  });
}

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AddAssetDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.http.post<Asset>(`${environment.apiUrl}/assets`, result).subscribe({
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
      width: '400px',
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
      width: '300px',
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

  async tokenizeAsset(asset: Asset): Promise<void> {
    this.tokenizingAssets.add(asset.id);
    try {
      const response = await firstValueFrom(
        this.http.post<{ transactionHash: string }>(
          `${environment.apiUrl}/assets/${asset.id}/tokenize`,
          {}
        )
      );

      if (response?.transactionHash) {
        // Trigger MetaMask confirmation
        await this.walletService.confirmTransaction(response.transactionHash);
        // Update status locally
        const assets = this.assets$.value;
        const index = assets.findIndex(a => a.id === asset.id);
        if (index !== -1) {
          assets[index].status = 'ATO';
          this.assets$.next([...assets]);
        }
        this.snackBar.open('Asset tokenized successfully', 'Close', { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open('Tokenization failed', 'Close', { duration: 3000 });
    } finally {
      this.tokenizingAssets.delete(asset.id);
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'REGISTERED': return 'primary';
      case 'ATO': return 'accent';
      case 'COLLATERAL': return 'warn';
      default: return '';
    }
  }
}