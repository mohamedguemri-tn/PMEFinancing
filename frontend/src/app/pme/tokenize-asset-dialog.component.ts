import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom } from 'rxjs';
import { WalletService } from '../auth/wallet.service';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';
import type { Asset } from './pme-assets.component';

@Component({
  selector: 'app-tokenize-asset-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, SharedModule],
  template: `
    <h2 mat-dialog-title>Tokenize asset</h2>
    <mat-dialog-content>
      <div class="tokenize-summary">
        <div class="summary-label">Asset</div>
        <div>{{ data.name }}</div>
      </div>
      <div class="tokenize-summary">
        <div class="summary-label">Estimated value</div>
        <div>{{ data.estimatedValue | number:'1.2-2' }} ETH</div>
      </div>
      <p class="tokenize-copy">
        This will create an ERC-721 token on Ethereum. Gas fees apply.
      </p>
      <app-tx-feedback [state]="txState" [message]="txMessage"></app-tx-feedback>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()" [disabled]="txState !== 'idle'">Cancel</button>
      <button mat-raised-button color="primary" (click)="confirmTokenize()" [disabled]="txState !== 'idle'">
        Confirm
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .tokenize-summary {
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

      .tokenize-copy {
        margin-top: var(--space-4);
        font-size: var(--font-size-base);
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class TokenizeAssetDialogComponent {
  @Inject(MAT_DIALOG_DATA) public data!: Asset;

  private http = inject(HttpClient);
  private walletService = inject(WalletService);
  public dialogRef = inject(MatDialogRef<TokenizeAssetDialogComponent>);

  txState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  txMessage = '';

  async confirmTokenize(): Promise<void> {
    if (this.txState !== 'idle') {
      return;
    }

    this.txState = 'waiting';
    this.txMessage = 'Waiting for transaction confirmation';

    try {
      const result = await firstValueFrom(
        this.http.post<{ transactionHash: string }>(
          `${environment.apiUrl}/assets/${this.data.id}/tokenize`,
          {}
        )
      );

      if (!result?.transactionHash) {
        throw new Error('No transaction hash returned');
      }

      this.txState = 'pending';
      this.txMessage = 'Transaction pending on Ethereum';
      await this.walletService.confirmTransaction(result.transactionHash);
      this.txState = 'success';
      this.txMessage = 'Tokenization successful';

      setTimeout(() => this.dialogRef.close({ status: 'ATO', assetId: this.data.id }), 900);
    } catch (error) {
      this.txState = 'error';
      this.txMessage = 'Tokenization failed';
    }
  }
}
