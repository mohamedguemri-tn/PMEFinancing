import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Asset } from './pme-assets.component';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="delete-dialog-shell">
      <h2 mat-dialog-title>Delete asset?</h2>
      <mat-dialog-content>
        Delete {{ data.name }}? This cannot be undone.
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>No</button>
        <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .delete-dialog-shell {
        min-height: 140px;
        display: grid;
        gap: var(--space-4);
        padding: var(--space-2);
      }
    `,
  ],
})
export class ConfirmDeleteDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Asset
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}