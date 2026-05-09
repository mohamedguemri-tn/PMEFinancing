import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-add-asset-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Add asset</h2>
    <mat-dialog-content>
      <form [formGroup]="assetForm">
        <mat-form-field appearance="outline">
          <mat-label>Asset name</mat-label>
          <input matInput formControlName="name" />
          <mat-error *ngIf="assetForm.get('name')?.hasError('required')">Asset name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Asset type</mat-label>
          <mat-select formControlName="assetType">
            <mat-option value="Equipment">Equipment</mat-option>
            <mat-option value="Real estate">Real estate</mat-option>
            <mat-option value="Patent">Patent</mat-option>
            <mat-option value="Vehicle">Vehicle</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
          <mat-error *ngIf="assetForm.get('assetType')?.hasError('required')">Asset type is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Estimated value (ETH)</mat-label>
          <input matInput type="number" formControlName="estimatedValue" />
          <mat-error *ngIf="assetForm.get('estimatedValue')?.hasError('required')">Estimated value is required</mat-error>
          <mat-error *ngIf="assetForm.get('estimatedValue')?.hasError('min')">Minimum value is 0.1 ETH</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput rows="4" formControlName="description"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="assetForm.invalid" (click)="onSave()">Save asset</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      form {
        display: grid;
        gap: var(--space-3);
        padding-top: var(--space-2);
      }
    `,
  ],
})
export class AddAssetDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddAssetDialogComponent>);

  assetForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    assetType: ['', Validators.required],
    estimatedValue: [0.1, [Validators.required, Validators.min(0.1)]],
    description: [''],
  });

  onSave(): void {
    if (this.assetForm.valid) {
      this.dialogRef.close(this.assetForm.value);
    }
  }
}