import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="success-container">
      <div class="success-content">
        <span class="ti-circle-check success-icon"></span>
        <h1 class="success-title">Registration submitted</h1>
        <p class="success-subtitle">Your account is pending governor approval. You will be able to sign in once approved.</p>
        <button mat-flat-button color="primary" routerLink="/login">Back to login</button>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: var(--color-surface);
      padding: var(--space-5);
    }

    .success-content {
      text-align: center;
      max-width: 400px;
      display: grid;
      gap: var(--space-4);
      justify-items: center;
    }

    .success-icon {
      font-size: var(--icon-2xl);
      width: var(--icon-2xl);
      height: var(--icon-2xl);
      display: block;
      color: var(--color-success);
      line-height: 1;
    }

    .success-title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .success-subtitle {
      font-size: var(--font-size-md);
      color: var(--color-text-secondary);
      line-height: 1.5;
    }

    button {
      min-width: 200px;
    }
  `]
})
export class SuccessComponent {}
