import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { BrowserProvider, Contract, parseEther } from 'ethers';

const LOAN_MANAGER_ABI = [
  'function fundLoan(uint256 loanId) payable',
  'event LoanFunded(uint256 indexed loanId, address indexed investor, uint256 amount, uint256 dueAt)',
];

interface MarketLoan {
  id: string;
  smeName: string;
  requestedAmount: number;
  assetName: string;
  collateralType: string;
  collateralValue: number;
  durationDays: number;
  loanToValue: number;
  status: string;
  onChainLoanId?: number;
}

@Component({
  selector: 'app-fund-loan-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, MatSnackBarModule, SharedModule],
  template: `
    <h2 mat-dialog-title>Confirm funding</h2>
    <mat-dialog-content>
      <div class="summary-row">
        <span>PME</span>
        <span>{{ data.smeName }}</span>
      </div>
      <div class="summary-row">
        <span>Amount</span>
        <span>{{ data.requestedAmount | number:'1.2-2' }} ETH</span>
      </div>
      <div class="summary-row">
        <span>Collateral</span>
        <span>{{ data.assetName }} ({{ data.collateralType }})</span>
      </div>
      <div class="summary-row">
        <span>Duration</span>
        <span>{{ data.durationDays }} days</span>
      </div>
      <div class="summary-row">
        <span>LTV</span>
        <span>{{ data.loanToValue | number:'1.0-1' }}%</span>
      </div>
      <mat-divider></mat-divider>
      <app-tx-feedback [state]="txState" [message]="txMessage"></app-tx-feedback>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="txState !== 'idle'">Cancel</button>
      <button mat-raised-button color="primary" (click)="confirmFunding()" [disabled]="txState !== 'idle'">
        Confirm & fund
      </button>
    </mat-dialog-actions>
  `,
})
export class FundLoanDialogComponent {
  public txState: 'idle' | 'pending' | 'success' | 'error' = 'idle';
  public txMessage = '';

  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private http = inject(HttpClient);

  constructor(
    private dialogRef: MatDialogRef<FundLoanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MarketLoan
  ) {}

  async confirmFunding(): Promise<void> {
    this.txState = 'pending';
    this.txMessage = 'Waiting for MetaMask confirmation…';

    const investorWallet = this.authService.currentUser?.walletAddress;
    if (!investorWallet) {
      this.txState = 'error';
      this.txMessage = 'Wallet not connected.';
      return;
    }

    if (this.data.onChainLoanId == null) {
      this.txState = 'error';
      this.txMessage = 'Loan has no on-chain ID — it may have been created before blockchain integration.';
      return;
    }

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(environment.loanManagerAddress, LOAN_MANAGER_ABI, signer);

      const tx = await contract['fundLoan'](
        BigInt(this.data.onChainLoanId),
        { value: parseEther(this.data.requestedAmount.toString()) }
      );

      this.txMessage = 'Transaction pending on Ethereum…';
      const receipt = await tx.wait();

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/loans/${this.data.id}/fund`, {
          transactionHash: receipt.hash,
          amountEth: this.data.requestedAmount,
        })
      );

      this.txState = 'success';
      this.txMessage = 'Loan funded successfully!';
      this.snackBar.open('Loan funded!', 'Close', { duration: 3000 });
      setTimeout(() => this.dialogRef.close({ status: 'FUNDED' }), 2000);
    } catch (error: any) {
      this.txState = 'error';
      this.txMessage = error?.error?.message ?? error?.message ?? 'Transaction failed. Please try again.';
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
