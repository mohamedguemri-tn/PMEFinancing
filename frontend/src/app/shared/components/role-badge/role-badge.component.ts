import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-role-badge',
  templateUrl: './role-badge.component.html',
  styleUrls: ['./role-badge.component.scss']
})
export class RoleBadgeComponent {
  @Input() role!: string;

  get badgeClass(): string {
    switch (this.role.toUpperCase()) {
      case 'PME':
        return 'role-pme';
      case 'INVESTOR':
        return 'role-investor';
      case 'GUARANTOR':
        return 'role-guarantor';
      case 'GOVERNOR':
        return 'role-governor';
      default:
        return '';
    }
  }
}