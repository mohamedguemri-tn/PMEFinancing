import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-tx-feedback',
  templateUrl: './tx-feedback.component.html',
  styleUrls: ['./tx-feedback.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-8px)', opacity: 0 }),
        animate('150ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateY(-8px)', opacity: 0 }))
      ])
    ])
  ]
})
export class TxFeedbackComponent implements OnChanges {
  @Input() state: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  @Input() message = '';
  @Input() txHash?: string;

  isVisible = false;
  private dismissTimer?: number;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state']) {
      this.updateVisibility();
    }
  }

  private updateVisibility(): void {
    if (this.state === 'idle') {
      this.isVisible = false;
      this.clearTimer();
    } else {
      this.isVisible = true;
      if (this.state === 'success') {
        this.scheduleDismiss();
      } else {
        this.clearTimer();
      }
    }
  }

  private scheduleDismiss(): void {
    this.clearTimer();
    this.dismissTimer = window.setTimeout(() => {
      this.isVisible = false;
    }, 5000);
  }

  private clearTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
  }

  get bannerClass(): string {
    switch (this.state) {
      case 'waiting':
      case 'pending':
        return 'banner-warning';
      case 'success':
        return 'banner-success';
      case 'error':
        return 'banner-error';
      default:
        return '';
    }
  }

  get icon(): string {
    switch (this.state) {
      case 'waiting':
        return 'refresh'; // spinning
      case 'pending':
        return 'schedule';
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return '';
    }
  }

  get displayMessage(): string {
    if (this.state === 'waiting') {
      return 'Waiting for MetaMask...';
    }
    return this.message;
  }

  get truncatedHash(): string {
    if (!this.txHash) return '';
    return `${this.txHash.slice(0, 8)}...${this.txHash.slice(-6)}`;
  }

  get isSpinning(): boolean {
    return this.state === 'waiting';
  }
}