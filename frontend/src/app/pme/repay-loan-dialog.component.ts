import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom } from 'rxjs';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';

const LOAN_MANAGER_ABI = [
  'function repayLoan(uint256 loanId) payable',
  'event LoanRepaid(uint256 indexed loanId, address indexed pme, uint256 amount)',
];

export interface RepayLoanData {
  id: string;
  requestedAmount: number;
  assetName: string;
  durationDays: number;
  onChainLoanId?: number;
}

@Component({
  selector: 'app-repay-loan-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, SharedModule],
  template: `
    <h2 mat-dialog-title>Repay loan</h2>
    <mat-dialog-content>
      <div class="summary-row">
        <div class="summary-label">Amount</div>
        <div>{{ data.requestedAmount | number:'1.2-2' }} ETH</div>
      </div>
      <div class="summary-row">
        <div class="summary-label">Collateral</div>
        <div>{{ data.assetName }}</div>
      </div>
      <div class="summary-row">
        <div class="summary-label">Duration</div>
        <div>{{ data.durationDays }} days</div>
      </div>
      <app-tx-feedback [state]="txState" [message]="txMessage"></app-tx-feedback>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()" [disabled]="txState !== 'idle'">Cancel</button>
      <button mat-raised-button color="primary" (click)="confirmRepay()" [disabled]="txState !== 'idle'">
        Confirm repayment
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: var(--space-3) 0;
        border-bottom: 0.5px solid var(--color-border);
        font-size: var(--font-size-md);
      }

      .summary-label {
        color: var(--color-text-secondary);
        font-size: var(--font-size-base);
      }
    `,
  ],
})
export class RepayLoanDialogComponent {
  public dialogRef = inject(MatDialogRef<RepayLoanDialogComponent>);
  private http = inject(HttpClient);

  txState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  txMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: RepayLoanData) {}

  async confirmRepay(): Promise<void> {
    if (this.txState !== 'idle') return;

    if (this.data.onChainLoanId == null) {
      this.txState = 'error';
      this.txMessage = 'Loan has no on-chain ID — it may have been created before blockchain integration.';
      return;
    }

    this.txState = 'waiting';
    this.txMessage = 'Waiting for MetaMask confirmation…';

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(environment.loanManagerAddress, LOAN_MANAGER_ABI, signer);

      const tx = await contract['repayLoan'](
        BigInt(this.data.onChainLoanId),
        { value: parseEther(this.data.requestedAmount.toString()) }
      );

      this.txState = 'pending';
      this.txMessage = 'Transaction pending on Ethereum…';
      const receipt = await tx.wait();

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/loans/${this.data.id}/repay`, {
          transactionHash: receipt.hash,
          amountEth: this.data.requestedAmount,
        })
      );

      this.txState = 'success';
      this.txMessage = 'Loan repaid successfully';
      setTimeout(() => this.dialogRef.close({ status: 'REPAID', loanId: this.data.id }), 900);
    } catch (error: any) {
      this.txState = 'error';
      this.txMessage = error?.error?.detail ?? error?.error?.message ?? error?.message ?? 'Repayment failed';
    }
  }
}
