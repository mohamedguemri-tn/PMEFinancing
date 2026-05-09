import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guarantor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-shell">
      <h1>Guarantor Dashboard</h1>
      <p>Welcome to the guarantor dashboard.</p>
    </div>
  `,
})
export class GuarantorComponent {}
