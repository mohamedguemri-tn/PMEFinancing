import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type CardColor = 'primary' | 'success' | 'warning' | 'danger' | 'governor' | undefined;

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [ngClass]="colorClass">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--color-surface);
      border-radius: var(--radius-md);
      border: 0.5px solid var(--color-border);
      padding: var(--space-4);
    }

    .stat-card.color-primary {
      background: var(--color-primary-bg);
      border-color: var(--color-primary);
    }
    .stat-card.color-success {
      background: var(--color-success-bg);
      border-color: var(--color-success);
    }
    .stat-card.color-warning {
      background: var(--color-warning-bg);
      border-color: var(--color-warning);
    }
    .stat-card.color-danger {
      background: var(--color-danger-bg);
      border-color: var(--color-danger);
    }
    .stat-card.color-governor {
      background: var(--color-governor-bg);
      border-color: var(--color-governor);
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: var(--font-weight-medium);
    }

    .stat-value {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      margin-top: var(--space-2);
      line-height: 1.2;
    }

    .stat-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-1);
    }
  `]
})
export class StatCardComponent {
  @Input() label!: string;
  @Input() value!: string | number;
  @Input() subtitle?: string;
  @Input() color?: CardColor;

  get colorClass(): string {
    return this.color ? `color-${this.color}` : '';
  }
}
