import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom } from 'rxjs';
import { BrowserProvider, Contract } from 'ethers';
import { SharedModule } from '../shared/shared.module';
import { environment } from '../../environments/environment';
import type { Asset } from './pme-assets.component';

const MINT_ABI = [
  'function mint(address pmeAddress, string tokenURI, string assetType) returns (uint256)',
  'event AssetTokenized(address indexed owner, uint256 indexed tokenId, string assetType, uint8 status)',
];

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
  public data = inject<Asset>(MAT_DIALOG_DATA);

  private http = inject(HttpClient);
  public dialogRef = inject(MatDialogRef<TokenizeAssetDialogComponent>);

  txState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  txMessage = '';

  async confirmTokenize(): Promise<void> {
    if (this.txState !== 'idle') return;

    this.txState = 'waiting';
    this.txMessage = 'Waiting for MetaMask confirmation…';

    try {
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(environment.contractAddress, MINT_ABI, signer);
      const pmeAddress = await signer.getAddress();

      const metadata = JSON.stringify({
        name: this.data.name,
        assetType: this.data.assetType,
        estimatedValue: this.data.estimatedValue,
        platform: 'BlockFin PME',
      });
      const tokenURI = 'data:application/json;base64,' + btoa(metadata);

      const tx = await contract['mint'](pmeAddress, tokenURI, this.data.assetType);

      this.txState = 'pending';
      this.txMessage = 'Transaction pending on Ethereum…';

      const receipt = await tx.wait();

      let tokenId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'AssetTokenized') {
            tokenId = Number(parsed.args['tokenId']);
            break;
          }
        } catch {
          // skip logs that don't belong to this contract
        }
      }

      if (tokenId === null) throw new Error('AssetTokenized event not found in receipt');

      await firstValueFrom(
        this.http.post<{ transactionHash: string }>(
          `${environment.apiUrl}/assets/${this.data.id}/tokenize`,
          { transactionHash: receipt.hash, tokenId }
        )
      );

      this.txState = 'success';
      this.txMessage = 'Tokenization successful';
      setTimeout(() => this.dialogRef.close({ status: 'ATO', assetId: this.data.id }), 900);
    } catch (error: any) {
      this.txState = 'error';
      this.txMessage = error?.error?.message ?? error?.message ?? 'Tokenization failed';
      console.error('Tokenize error:', error);
    }
  }
}
