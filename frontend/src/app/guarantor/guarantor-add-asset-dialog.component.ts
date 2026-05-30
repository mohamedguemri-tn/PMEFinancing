import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-add-asset-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Add asset</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Asset name</mat-label>
        <input matInput formControlName="name" required />
        <mat-error>Asset name is required.</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Asset type</mat-label>
        <mat-select formControlName="assetType">
          <mat-option value="Equipment">Equipment</mat-option>
          <mat-option value="Real estate">Real estate</mat-option>
          <mat-option value="Vehicle">Vehicle</mat-option>
          <mat-option value="Patent">Patent</mat-option>
          <mat-option value="Other">Other</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Estimated value (ETH)</mat-label>
        <input matInput type="number" formControlName="estimatedValue" min="0.1" />
        <mat-error>Enter a value of at least 0.1 ETH.</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="submit()">Add</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`],
})
export class AddAssetDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddAssetDialogComponent>);

  form = this.fb.group({
    name: ['', Validators.required],
    assetType: ['Equipment', Validators.required],
    estimatedValue: [0.1, [Validators.required, Validators.min(0.1)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
