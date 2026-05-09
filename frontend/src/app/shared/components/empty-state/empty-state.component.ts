import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon }}</mat-icon>
      <div class="empty-title">{{ title }}</div>
      <div class="empty-subtitle">{{ subtitle }}</div>
      <button
        *ngIf="buttonLabel"
        mat-flat-button
        color="primary"
        (click)="buttonClick.emit()"
      >{{ buttonLabel }}</button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: grid;
      gap: var(--space-4);
      align-items: center;
      justify-items: center;
      padding: var(--space-7) var(--space-5);
      border: 1px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      text-align: center;
    }

    .empty-icon {
      font-size: var(--icon-xl);
      width: var(--icon-xl);
      height: var(--icon-xl);
      display: block;
      color: var(--color-text-muted);
      line-height: 1;
    }

    .empty-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .empty-subtitle {
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
      margin-top: calc(var(--space-1) * -1);
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon!: string;
  @Input() title!: string;
  @Input() subtitle!: string;
  @Input() buttonLabel?: string;
  @Output() buttonClick = new EventEmitter<void>();
}
