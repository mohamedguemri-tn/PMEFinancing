import { AfterViewInit, Component, inject, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';
import { AddAssetDialogComponent } from './guarantor-add-asset-dialog.component';

interface LinkedLoanDetails {
  loanId: string;
  status: string;
  tokenId: string;
  txHash: string;
  amountEth: number;
}

interface GuaranteeAsset {
  id: string;
  assetName: string;
  type: string;
  organization: string;
  valueEth: number;
  status: string;
  linkedPme?: string;
  linkedLoan?: LinkedLoanDetails;
}

@Component({
  selector: 'app-guarantor-guarantees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSidenavModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTooltipModule,
    SharedModule,
    AddAssetDialogComponent,
  ],
  template: `
    <div class="guarantees-shell">
      <div class="page-header">
        <div>
          <h1>My guarantees</h1>
        </div>
        <button mat-raised-button color="primary" (click)="openAddAssetDialog()">
          <span class="ti-plus"></span>
          Add asset
        </button>
      </div>

      <mat-drawer-container class="drawer-container" autosize>
        <mat-drawer #drawer mode="side" position="end" [opened]="drawerOpen" class="detail-drawer">
          <div class="drawer-header">
            <h2>Asset details</h2>
            <button mat-icon-button aria-label="Close drawer" (click)="closeDrawer()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <ng-container *ngIf="selectedAsset; else emptyDrawer">
            <div class="detail-row">
              <span>Asset</span>
              <span>{{ selectedAsset.assetName }}</span>
            </div>
            <div class="detail-row">
              <span>Type</span>
              <span>{{ selectedAsset.type }}</span>
            </div>
            <div class="detail-row">
              <span>Organization</span>
              <span>{{ selectedAsset.organization }}</span>
            </div>
            <div class="detail-row">
              <span>Value</span>
              <span>{{ selectedAsset.valueEth | number:'1.2-2' }} ETH</span>
            </div>
            <div class="detail-row">
              <span>Status</span>
              <app-status-badge [status]="selectedAsset.status"></app-status-badge>
            </div>
            <mat-divider></mat-divider>

            <ng-container *ngIf="selectedAsset.linkedLoan; else noLoanLinked">
              <div class="detail-row">
                <span>Linked loan</span>
                <span>{{ selectedAsset.linkedLoan.loanId }}</span>
              </div>
              <div class="detail-row">
                <span>Loan status</span>
                <app-status-badge [status]="selectedAsset.linkedLoan.status"></app-status-badge>
              </div>
              <div class="detail-row monospace">
                <span>Token ID</span>
                <span>{{ selectedAsset.linkedLoan.tokenId }}</span>
              </div>
              <div class="detail-row monospace link-row">
                <span>Blockchain tx</span>
                <a [href]="buildTxLink(selectedAsset.linkedLoan.txHash)" target="_blank" rel="noopener">
                  <span>{{ selectedAsset.linkedLoan.txHash }}</span>
                  <mat-icon>launch</mat-icon>
                </a>
              </div>
            </ng-container>

            <ng-template #noLoanLinked>
              <div class="detail-row">
                <span>Linked loan</span>
                <span>—</span>
              </div>
            </ng-template>

            <button mat-stroked-button color="warn" class="release-button" *ngIf="canRelease(selectedAsset)" (click)="releaseGuarantee()">
              Release guarantee
            </button>
          </ng-container>

          <ng-template #emptyDrawer>
            <p>No asset selected.</p>
          </ng-template>
        </mat-drawer>

        <div class="content-panel">
          <ng-container *ngIf="dataSource?.data?.length; else emptyState">
            <mat-card>
              <table mat-table [dataSource]="dataSource" class="mat-elevation-z0">
                <ng-container matColumnDef="assetName">
                  <th mat-header-cell *matHeaderCellDef>Asset name</th>
                  <td mat-cell *matCellDef="let item">{{ item.assetName }}</td>
                </ng-container>

                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let item">{{ item.type }}</td>
                </ng-container>

                <ng-container matColumnDef="organization">
                  <th mat-header-cell *matHeaderCellDef>Organization</th>
                  <td mat-cell *matCellDef="let item">{{ item.organization }}</td>
                </ng-container>

                <ng-container matColumnDef="valueEth">
                  <th mat-header-cell *matHeaderCellDef>Value (ETH)</th>
                  <td mat-cell *matCellDef="let item">{{ item.valueEth | number:'1.2-2' }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let item"><app-status-badge [status]="item.status"></app-status-badge></td>
                </ng-container>

                <ng-container matColumnDef="linkedPme">
                  <th mat-header-cell *matHeaderCellDef>Linked PME</th>
                  <td mat-cell *matCellDef="let item">{{ item.linkedPme || '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let item">
                    <button mat-icon-button matTooltip="View details" (click)="openDrawer(item)">
                      <span class="ti-eye"></span>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
              <mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
            </mat-card>
          </ng-container>

          <ng-template #emptyState>
            <app-empty-state
              icon="ti-shield-check"
              title="No assets provided yet"
              subtitle="Add your first asset to start guaranteeing loans."
              buttonLabel="Add your first asset"
              (buttonClick)="openAddAssetDialog()"
            ></app-empty-state>
          </ng-template>
        </div>
      </mat-drawer-container>
    </div>
  `,
  styles: [`
    .guarantees-shell {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-5);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
    }

    .page-header h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .drawer-container {
      min-height: 480px;
      border: 0.5px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .content-panel {
      width: 100%;
      padding: var(--space-4);
    }

    .detail-drawer {
      width: 340px;
      padding: var(--space-5);
      border-left: 0.5px solid var(--color-border);
      background: var(--color-surface);
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-5);
    }

    .drawer-header h2 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-3);
      font-size: var(--font-size-base);
      color: var(--color-text-primary);
    }

    .detail-row span:first-child {
      color: var(--color-text-secondary);
      flex-shrink: 0;
    }

    .monospace {
      font-family: monospace, monospace;
      font-size: var(--font-size-xs);
      word-break: break-all;
    }

    .link-row a {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-primary);
      text-decoration: none;
    }

    .release-button {
      margin-top: var(--space-5);
      width: 100%;
    }

    table { width: 100%; }

    mat-card {
      padding: 0 !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }

  `],
})
export class GuarantorGuaranteesComponent implements OnInit, AfterViewInit {
  displayedColumns = ['assetName', 'type', 'organization', 'valueEth', 'status', 'linkedPme', 'actions'];
  dataSource = new MatTableDataSource<GuaranteeAsset>([]);
  selectedAsset?: GuaranteeAsset;
  drawerOpen = false;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.fetchAssets();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  openDrawer(asset: GuaranteeAsset): void {
    this.selectedAsset = asset;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  openAddAssetDialog(): void {
    const dialogRef = this.dialog.open(AddAssetDialogComponent, {
      maxWidth: '480px',
      width: '100%',
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.fetchAssets();
      }
    });
  }

  releaseGuarantee(): void {
    if (!this.selectedAsset) {
      return;
    }

    this.http.post(`${environment.apiUrl}/guarantor/assets/${this.selectedAsset.id}/release`, {}).subscribe({
      next: () => {
        this.snackBar.open('Guarantee released.', 'Close', { duration: 3000 });
        this.fetchAssets();
        this.closeDrawer();
      },
      error: () => {
        this.snackBar.open('Unable to release guarantee.', 'Close', { duration: 3000 });
      },
    });
  }

  canRelease(asset: GuaranteeAsset): boolean {
    return asset.status.toUpperCase() === 'COLLATERAL' && asset.linkedLoan?.status.toUpperCase() === 'REPAID';
  }

  buildTxLink(hash: string): string {
    return `https://etherscan.io/tx/${hash}`;
  }

  private fetchAssets(): void {
    this.http.get<GuaranteeAsset[]>(`${environment.apiUrl}/guarantor/assets`).subscribe({
      next: (items) => {
        this.dataSource.data = items;
      },
      error: () => {
        this.dataSource.data = [];
      },
    });
  }
}
