import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-governor-parameters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSliderModule, MatChipsModule, MatButtonModule, MatIconModule, MatSnackBarModule, SharedModule],
  template: `
    <div class="parameters-shell">
      <div class="header-row">
        <h1>Platform parameters</h1>
      </div>

      <mat-card>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Max loan amount (ETH)</mat-label>
            <input matInput type="number" formControlName="maxLoanAmount" min="0.1" />
          </mat-form-field>

          <div class="slider-row">
            <mat-label>Collateral ratio (%)</mat-label>
            <mat-slider formControlName="collateralRatio" min="50" max="95" step="5" tickInterval="5"></mat-slider>
            <div class="slider-value">Loan = {{ form.value.collateralRatio }}% of collateral value</div>
          </div>

          <div class="interest-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Min interest rate (%)</mat-label>
              <input matInput type="number" formControlName="interestRateMin" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Max interest rate (%)</mat-label>
              <input matInput type="number" formControlName="interestRateMax" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Loan durations allowed</mat-label>
            <mat-chip-grid #chipGrid>
              <mat-chip-row *ngFor="let duration of durations" removable="true" (removed)="removeDuration(duration)">
                {{ duration }} days
                <button matChipRemove aria-label="Remove">×</button>
              </mat-chip-row>
              <input
                placeholder="Add duration"
                [matChipInputFor]="chipGrid"
                [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                [matChipInputAddOnBlur]="true"
                (matChipInputTokenEnd)="addDuration($event)"
              />
            </mat-chip-grid>
          </mat-form-field>

          <button mat-raised-button color="primary" class="save-button" type="submit" [disabled]="form.invalid">Save parameters</button>
        </form>

        <div class="meta-row">
          <span>Last updated: {{ lastUpdated | date:'medium' }}</span>
          <span class="muted">Governor wallet: {{ governorWallet }}</span>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .parameters-shell {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-5);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
    }
    .header-row h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }
    mat-card {
      padding: var(--space-5) !important;
    }
    .full-width {
      width: 100%;
      margin-bottom: var(--space-4);
    }
    .half-width {
      width: calc(50% - var(--space-2));
    }
    .interest-row {
      display: flex;
      gap: var(--space-4);
      flex-wrap: wrap;
      margin-bottom: var(--space-4);
    }
    .slider-row {
      display: grid;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    .slider-value {
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }
    .save-button {
      width: 100%;
      margin-top: var(--space-3);
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: var(--space-5);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      border-top: 0.5px solid var(--color-border);
      padding-top: var(--space-4);
    }
    .muted {
      color: var(--color-text-muted);
    }
  `],
})
export class GovernorParametersComponent implements OnInit {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    maxLoanAmount: [0.1, [Validators.required, Validators.min(0.1)]],
    collateralRatio: [70, [Validators.required, Validators.min(50), Validators.max(95)]],
    interestRateMin: [5, [Validators.required, Validators.min(0)]],
    interestRateMax: [15, [Validators.required, Validators.min(0)]],
  });

  durations: number[] = [30, 60, 90, 180];
  separatorKeysCodes = [ENTER, COMMA];
  lastUpdated = new Date();
  governorWallet = '';

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.fetchParams();
  }

  addDuration(event: MatChipInputEvent): void {
    const value = event.value?.trim();
    if (value) {
      const duration = Number(value);
      if (!isNaN(duration) && duration > 0 && !this.durations.includes(duration)) {
        this.durations.push(duration);
      }
    }
    event.chipInput!.clear();
  }

  removeDuration(duration: number): void {
    this.durations = this.durations.filter((item) => item !== duration);
  }

  save(): void {
    const body = {
      ...this.form.value,
      durations: this.durations,
    };
    this.http.put(`${environment.apiUrl}/governor/parameters`, body).subscribe({
      next: () => {
        this.lastUpdated = new Date();
        this.snackBar.open('Parameters saved successfully.', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Unable to save parameters.', 'Close', { duration: 3000 });
      },
    });
  }

  private fetchParams(): void {
    this.http.get<any>(`${environment.apiUrl}/governor/parameters`).subscribe({
      next: (data) => {
        this.form.patchValue({
          maxLoanAmount: data.maxLoanAmount,
          collateralRatio: data.collateralRatio,
          interestRateMin: data.interestRateMin,
          interestRateMax: data.interestRateMax,
        });
        this.durations = data.durations || this.durations;
        this.lastUpdated = data.updatedAt ? new Date(data.updatedAt) : new Date();
        this.governorWallet = data.governorWallet || '';
      },
      error: () => {
        this.governorWallet = '';
      },
    });
  }
}
