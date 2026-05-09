import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
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
import { SharedModule } from '../shared/shared.module';
import { WalletService } from '../auth/wallet.service';
import { environment } from '../../environments/environment';

interface Asset {
  id: string;
  name: string;
  assetType: string;
  estimatedValue: number;
  status: 'REGISTERED' | 'ATO' | 'COLLATERAL';
}

interface LoanRequest {
  id: string;
  amount: number;
  collateralName: string;
  duration: number;
  status: string;
  createdAt: string;
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
    SharedModule,
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
            <table mat-table [dataSource]="loanRequests" class="requests-table">
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let request">{{ request.amount | number:'1.2-2' }} ETH</td>
              </ng-container>

              <ng-container matColumnDef="collateral">
                <th mat-header-cell *matHeaderCellDef>Collateral</th>
                <td mat-cell *matCellDef="let request">{{ request.collateralName }}</td>
              </ng-container>

              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Duration</th>
                <td mat-cell *matCellDef="let request">{{ request.duration }} days</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let request">
                  <app-status-badge [status]="request.status"></app-status-badge>
                </td>
              </ng-container>

              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let request">{{ request.createdAt | date:'mediumDate' }}</td>
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

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private walletService = inject(WalletService);
  private fb = inject(FormBuilder);

  constructor() {
    this.loanForm = this.fb.group({
      collateralAssetId: ['', Validators.required],
      loanAmount: [0, [Validators.required, Validators.min(0.1)]],
      duration: [30, Validators.required],
    });
  }

  ngOnInit(): void {
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
    return ['amount', 'collateral', 'duration', 'status', 'createdAt', 'actions'];
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
    const wallet = this.walletService.currentUser?.walletAddress;
    if (!wallet) {
      return;
    }

    this.http.get<Asset[]>(`${environment.apiUrl}/assets?pmeWallet=${wallet}`).subscribe({
      next: (assets) => {
        this.collateralAssets = assets.filter((asset) => asset.status === 'ATO');
      },
      error: () => {
        this.collateralAssets = [];
      },
    });
  }

  private loadLoanRequests(): void {
    const wallet = this.walletService.currentUser?.walletAddress;
    if (!wallet) {
      return;
    }

    this.http.get<LoanRequest[]>(`${environment.apiUrl}/loans?pmeWallet=${wallet}`).subscribe({
      next: (requests) => {
        this.loanRequests = requests;
      },
      error: () => {
        this.loanRequests = [];
      },
    });
  }

  submitLoanRequest(): void {
    if (this.loanForm.invalid || !this.selectedCollateral) {
      return;
    }

    this.txState = 'waiting';
    this.txMessage = 'Preparing loan request';

    const payload = {
      collateralAssetId: this.selectedCollateral.id,
      amount: this.loanForm.value.loanAmount,
      duration: this.loanForm.value.duration,
    };

    this.http.post<LoanRequest>(`${environment.apiUrl}/loans`, payload).subscribe({
      next: (request) => {
        this.txState = 'pending';
        this.txMessage = 'Loan request submitted';
        setTimeout(() => {
          this.txState = 'success';
          this.txMessage = 'Loan request confirmed';
          this.loanRequests = [request, ...this.loanRequests];
        }, 900);
      },
      error: () => {
        this.txState = 'error';
        this.txMessage = 'Loan request failed';
      },
    });
  }

  repayLoan(request: LoanRequest): void {
    this.snackBar.open(`Repay request ${request.id} not implemented`, 'Close', { duration: 3000 });
  }
}
