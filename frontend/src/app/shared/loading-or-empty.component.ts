import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-loading-or-empty',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule],
  template: `
    <div class="state-container">
      <ng-container *ngIf="state === 'loading'">
        <mat-spinner diameter="40"></mat-spinner>
        <p class="state-label">{{ loadingText || 'Loading...' }}</p>
      </ng-container>

      <ng-container *ngIf="state === 'error'">
        <mat-icon class="state-icon error-icon">error_outline</mat-icon>
        <p class="state-label error-label">{{ errorText || 'Something went wrong.' }}</p>
        <button mat-button color="primary" (click)="retry.emit()">Retry</button>
      </ng-container>

      <ng-container *ngIf="state === 'empty'">
        <mat-icon class="state-icon empty-icon">inbox</mat-icon>
        <p class="state-label">{{ emptyText || 'No items found.' }}</p>
      </ng-container>
    </div>
  `,
  styles: [`
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 12px;
    }
    .state-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; }
    .error-icon { color: var(--color-error, #f44336); opacity: 0.8; }
    .state-label { margin: 0; color: var(--color-text-secondary); font-size: 14px; }
    .error-label { color: var(--color-error, #f44336); }
  `],
})
export class LoadingOrEmptyComponent {
  @Input() state: 'loading' | 'empty' | 'error' = 'loading';
  @Input() loadingText?: string;
  @Input() emptyText?: string;
  @Input() errorText?: string;
  @Output() retry = new EventEmitter<void>();
}
