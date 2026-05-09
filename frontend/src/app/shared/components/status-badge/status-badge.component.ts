import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status!: string;

  get badgeClass(): string {
    switch (this.status.toUpperCase()) {
      case 'PENDING':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      case 'ATO':
        return 'status-ato';
      case 'COLLATERAL':
        return 'status-collateral';
      case 'REGISTERED':
        return 'status-registered';
      case 'REQUESTED':
        return 'status-requested';
      case 'FUNDED':
        return 'status-funded';
      case 'REPAID':
        return 'status-repaid';
      case 'DEFAULTED':
        return 'status-defaulted';
      default:
        return '';
    }
  }

  get hasDot(): boolean {
    return ['PENDING', 'APPROVED', 'REJECTED'].includes(this.status.toUpperCase());
  }
}