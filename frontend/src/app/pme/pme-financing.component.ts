import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { RepayLoanDialogComponent } from './repay-loan-dialog.component';
import { firstValueFrom } from 'rxjs';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { PaginatedResult } from '../shared/models/paginated-result';

const LOAN_MANAGER_ABI = [
  'function requestLoan(uint256 collateralTokenId, uint256 amount, uint256 durationDays) returns (uint256)',
  'event LoanRequested(uint256 indexed loanId, address indexed pme, uint256 collateralTokenId, uint256 amount, uint256 durationDays)',
];

interface Asset {
  id: string;
  name: string;
  assetType: string;
  estimatedValue: number;
  status: 'REGISTERED' | 'ATO' | 'COLLATERAL';
  tokenId?: number;
}

interface LoanRequest {
  id: string;
  requestedAmount: number;
  assetName: string;
  durationDays: number;
  status: string;
  onChainLoanId?: number;
}

@Component({
  selector: 'app-pme-financing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    SharedModule,
    RepayLoanDialogComponent,
  ],
  template: `
    <div class="financing-shell">
      <mat-tab-group>
        <mat-tab label="Request a loan">
          <div class="loan-request-grid">
            <form [formGroup]="loanForm" class="loan-request-grid">
            <mat-card>
              <h3>1. Select collateral</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Choose tokenized asset</mat-label>
                <mat-select formControlName="collateralAssetId">
                  <mat-option *ngFor="let asset of collateralAssets" [value]="asset.id">
                    {{ asset.name }} · {{ asset.estimatedValue | number:'1.2-2' }} ETH
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </mat-card>

            <mat-card>
              <h3>2. Loan details</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Loan amount (ETH)</mat-label>
                  <input matInput type="number" formControlName="loanAmount" />
                  <mat-error *ngIf="loanForm.controls['loanAmount'].hasError('required')">
                    Loan amount is required
                  </mat-error>
                  <mat-error *ngIf="loanForm.controls['loanAmount'].hasError('max')">
                    Maximum loan is {{ maxLoanAmount | number:'1.2-2' }} ETH
                  </mat-error>
                </mat-form-field>

                <mat-button-toggle-group
                  formControlName="duration"
                  aria-label="Duration"
                  class="duration-toggle"
                >
                  <mat-button-toggle value="30">30</mat-button-toggle>
                  <mat-button-toggle value="60">60</mat-button-toggle>
                  <mat-button-toggle value="90">90</mat-button-toggle>
                  <mat-button-toggle value="180">180</mat-button-toggle>
                </mat-button-toggle-group>
            </mat-card>
          </form>

            <mat-card class="summary-card">
              <h3>Summary</h3>
              <div class="summary-row"><span>Loan amount</span><span>{{ (loanForm.value.loanAmount || 0) | number:'1.2-2' }} ETH</span></div>
              <div class="summary-row"><span>Collateral</span><span>{{ selectedCollateral?.name || '—' }}</span></div>
              <div class="summary-row"><span>Duration</span><span>{{ loanForm.value.duration }} days</span></div>
              <div class="summary-row"><span>Estimated interest</span><span>{{ estimatedInterest | number:'1.2-2' }} ETH</span></div>
              <button mat-raised-button color="primary" (click)="submitLoanRequest()" [disabled]="!loanForm.valid || !selectedCollateral">
                Submit request
              </button>
              <app-tx-feedback [state]="txState" [message]="txMessage"></app-tx-feedback>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="My loan requests">
          <div class="loan-requests-table">
            <app-loading-or-empty
              *ngIf="loansLoadingState !== 'loaded'"
              [state]="loansLoadingState"
              emptyText="No loan requests yet. Submit your first loan request."
              [errorText]="loansErrorMessage"
              (retry)="loadLoanRequests()"
            ></app-loading-or-empty>
            <table mat-table [dataSource]="loanRequests" *ngIf="loansLoadingState === 'loaded'" class="requests-table" style="width:100%">
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let request">{{ request.requestedAmount | number:'1.2-2' }} ETH</td>
              </ng-container>

              <ng-container matColumnDef="collateral">
                <th mat-header-cell *matHeaderCellDef>Collateral</th>
                <td mat-cell *matCellDef="let request">{{ request.assetName }}</td>
              </ng-container>

              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Duration</th>
                <td mat-cell *matCellDef="let request">{{ request.durationDays }} days</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let request">
                  <app-status-badge [status]="request.status"></app-status-badge>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let request">
                  <button mat-button color="primary" *ngIf="request.status === 'FUNDED'" (click)="repayLoan(request)">Repay</button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="loanColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: loanColumns"></tr>
            </table>
            <mat-paginator
              *ngIf="loansLoadingState === 'loaded'"
              [length]="loansTotalCount"
              [pageSize]="loansPageSize"
              [pageSizeOptions]="[5, 10, 25]"
              [pageIndex]="loansCurrentPage - 1"
              (page)="onLoansPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .financing-shell {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-5);
      }

      .loan-request-grid {
        display: grid;
        gap: var(--space-4);
        padding-top: var(--space-4);
      }

      .loan-request-grid mat-card {
        padding: var(--space-4) !important;
        display: grid;
        gap: var(--space-3);
      }

      .loan-request-grid mat-card h3 {
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .full-width { width: 100%; }

      .duration-toggle {
        margin-top: var(--space-2);
        display: flex;
        gap: var(--space-2);
      }

      .summary-card {
        min-height: 280px;
        display: grid;
        gap: var(--space-3);
        padding: var(--space-4) !important;
      }

      .summary-card h3 {
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        font-size: var(--font-size-base);
        padding: var(--space-2) 0;
        border-bottom: 0.5px solid var(--color-border);
        color: var(--color-text-secondary);
      }

      .summary-row span:last-child {
        color: var(--color-text-primary);
        font-weight: var(--font-weight-medium);
      }

      .loan-requests-table,
      .requests-table { width: 100%; }
    `,
  ],
})
export class PmeFinancingComponent implements OnInit {
  loanForm: FormGroup;
  collateralAssets: Asset[] = [];
  loanRequests: LoanRequest[] = [];
  txState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  txMessage = '';
  loansLoadingState: 'loading' | 'loaded' | 'empty' | 'error' = 'loading';
  loansErrorMessage = '';
  loansCurrentPage = 1;
  loansPageSize = 10;
  loansTotalCount = 0;

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  private preselectAssetId: string | null = null;

  constructor() {
    this.loanForm = this.fb.group({
      collateralAssetId: ['', Validators.required],
      loanAmount: [0, [Validators.required, Validators.min(0.1)]],
      duration: [30, Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['collateralAssetId']) {
        this.preselectAssetId = params['collateralAssetId'];
      }
    });
    this.loadAssets();
    this.loadLoanRequests();
    this.loanForm.controls['loanAmount'].valueChanges.subscribe(() => {
      this.validateLoanAmount();
    });
    this.loanForm.controls['collateralAssetId'].valueChanges.subscribe(() => {
      this.validateLoanAmount();
    });
  }

  get selectedCollateral(): Asset | undefined {
    return this.collateralAssets.find((asset) => asset.id === this.loanForm.value.collateralAssetId);
  }

  get maxLoanAmount(): number {
    return this.selectedCollateral ? this.selectedCollateral.estimatedValue * 0.8 : 0;
  }

  get estimatedInterest(): number {
    const amount = Number(this.loanForm.value.loanAmount || 0);
    return amount * 0.08;
  }

  get loanColumns(): string[] {
    return ['amount', 'collateral', 'duration', 'status', 'actions'];
  }

  private validateLoanAmount(): void {
    if (!this.selectedCollateral) {
      return;
    }

    const control = this.loanForm.controls['loanAmount'];
    if (control.value > this.maxLoanAmount) {
      control.setErrors({ max: true });
    } else {
      if (control.hasError('max')) {
        control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      }
    }
  }

  private loadAssets(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) {
      return;
    }

    this.http.get<PaginatedResult<Asset>>(`${environment.apiUrl}/assets`, {
      params: { pmeWallet: wallet, page: 1, pageSize: 100 },
    }).subscribe({
      next: (result) => {
        this.collateralAssets = result.items.filter((asset) => asset.status === 'ATO');
        if (this.preselectAssetId) {
          this.loanForm.controls['collateralAssetId'].setValue(this.preselectAssetId);
          this.preselectAssetId = null;
        }
      },
      error: () => {
        this.collateralAssets = [];
      },
    });
  }

  loadLoanRequests(): void {
    const wallet = this.authService.currentUser?.walletAddress;
    if (!wallet) {
      return;
    }

    this.loansLoadingState = 'loading';
    this.http.get<PaginatedResult<LoanRequest>>(`${environment.apiUrl}/loans`, {
      params: { pmeWallet: wallet, page: this.loansCurrentPage, pageSize: this.loansPageSize }
    }).subscribe({
      next: (result) => {
        this.loanRequests = result.items;
        this.loansTotalCount = result.totalCount;
        this.loansLoadingState = result.items.length ? 'loaded' : 'empty';
      },
      error: () => {
        this.loanRequests = [];
        this.loansLoadingState = 'error';
        this.loansErrorMessage = 'Failed to load loan requests. Please try again.';
      },
    });
  }

  onLoansPageChange(event: PageEvent): void {
    this.loansCurrentPage = event.pageIndex + 1;
    this.loansPageSize = event.pageSize;
    this.loadLoanRequests();
  }

  async submitLoanRequest(): Promise<void> {
    if (this.loanForm.invalid || !this.selectedCollateral) return;

    const tokenId = this.selectedCollateral.tokenId;
    if (tokenId == null) {
      this.txState = 'error';
      this.txMessage = 'Asset has no on-chain token ID — ensure it is tokenized first';
      return;
    }

    this.txState = 'waiting';
    this.txMessage = 'Waiting for MetaMask confirmation…';

    try {
      const loanAmount: number = this.loanForm.value.loanAmount;
      const durationDays: number = this.loanForm.value.duration;

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(environment.loanManagerAddress, LOAN_MANAGER_ABI, signer);

      const tx = await contract['requestLoan'](
        BigInt(tokenId),
        parseEther(loanAmount.toString()),
        BigInt(durationDays)
      );

      this.txState = 'pending';
      this.txMessage = 'Transaction pending on Ethereum…';

      const receipt = await tx.wait();

      let onChainLoanId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'LoanRequested') {
            onChainLoanId = Number(parsed.args['loanId']);
            break;
          }
        } catch {}
      }

      if (onChainLoanId === null) throw new Error('LoanRequested event not found in receipt');

      const payload = {
        collateralAssetId: this.selectedCollateral.id,
        requestedAmount: loanAmount,
        durationDays,
        onChainLoanId,
        transactionHash: receipt.hash,
      };

      const request = await firstValueFrom(
        this.http.post<LoanRequest>(`${environment.apiUrl}/loans`, payload)
      );

      this.txState = 'success';
      this.txMessage = 'Loan request confirmed';
      this.loanRequests = [request, ...this.loanRequests];
    } catch (error: any) {
      this.txState = 'error';
      this.txMessage = error?.error?.message ?? error?.message ?? 'Loan request failed';
    }
  }

  repayLoan(request: LoanRequest): void {
    const dialogRef = this.dialog.open(RepayLoanDialogComponent, {
      width: '480px',
      data: request,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.status === 'REPAID') {
        this.loanRequests = this.loanRequests.map((l) =>
          l.id === result.loanId ? { ...l, status: 'REPAID' } : l
        );
        this.snackBar.open('Loan repaid successfully', 'Close', { duration: 3000 });
      }
    });
  }
}
