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
    <h2 mat-dialog-title>Add New Asset</h2>
    <mat-dialog-content>
      <form [formGroup]="assetForm">
        <mat-form-field appearance="fill">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
          <mat-error *ngIf="assetForm.get('name')?.invalid">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Asset Type</mat-label>
          <mat-select formControlName="assetType">
            <mat-option value="machinery">Machinery</mat-option>
            <mat-option value="property">Property</mat-option>
            <mat-option value="inventory">Inventory</mat-option>
            <mat-option value="equipment">Equipment</mat-option>
          </mat-select>
          <mat-error *ngIf="assetForm.get('assetType')?.invalid">Asset type is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Estimated Value</mat-label>
          <input matInput type="number" formControlName="estimatedValue" />
          <mat-error *ngIf="assetForm.get('estimatedValue')?.invalid">Valid value is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="assetForm.invalid" (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `,
})
export class AddAssetDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddAssetDialogComponent>);

  assetForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    assetType: ['', Validators.required],
    estimatedValue: [0, [Validators.required, Validators.min(1)]],
  });

  onSave(): void {
    if (this.assetForm.valid) {
      this.dialogRef.close(this.assetForm.value);
    }
  }
}