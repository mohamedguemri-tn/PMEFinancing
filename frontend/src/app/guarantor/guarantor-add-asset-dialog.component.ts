import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { WalletService } from '../auth/wallet.service';

@Component({
  selector: 'app-add-asset-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Add asset</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Asset name</mat-label>
        <input matInput formControlName="assetName" required />
        <mat-error *ngIf="form.controls.assetName.invalid">Asset name is required.</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Type</mat-label>
        <mat-select formControlName="type">
          <mat-option value="Equipment">Equipment</mat-option>
          <mat-option value="Real estate">Real estate</mat-option>
          <mat-option value="Vehicle">Vehicle</mat-option>
          <mat-option value="Patent">Patent</mat-option>
          <mat-option value="Other">Other</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Estimated value in ETH</mat-label>
        <input matInput type="number" formControlName="valueEth" min="0.1" />
        <mat-error *ngIf="form.controls.valueEth.invalid">Enter a value of at least 0.1 ETH.</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Organization name</mat-label>
        <input matInput formControlName="organization" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Supporting document note</mat-label>
        <textarea matInput rows="3" formControlName="note" placeholder="e.g. registration number, deed reference"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">Submit</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
  `],
})
export class AddAssetDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddAssetDialogComponent>);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private walletService = inject(WalletService);

  form = this.fb.group({
    assetName: ['', Validators.required],
    type: ['Equipment', Validators.required],
    valueEth: [0.1, [Validators.required, Validators.min(0.1)]],
    organization: [''],
    note: [''],
  });

  ngOnInit(): void {
    const organization = this.walletService.currentUser?.companyName ?? '';
    this.form.patchValue({ organization });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const payload = {
      assetName: this.form.value.assetName,
      type: this.form.value.type,
      valueEth: this.form.value.valueEth,
      organization: this.form.value.organization,
      note: this.form.value.note,
    };

    this.http.post(`${environment.apiUrl}/guarantor/assets`, payload).subscribe({
      next: () => {
        this.snackBar.open('Asset added successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snackBar.open('Unable to add asset. Please try again.', 'Close', { duration: 3000 });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
