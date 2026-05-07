import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-investor',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="page-shell">
      <mat-card>
        <h2>Investor Dashboard</h2>
        <p>Welcome to the Investor area. View funding opportunities and manage your portfolio here.</p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page-shell {
        display: flex;
        justify-content: center;
        padding: 24px;
      }

      mat-card {
        width: min(720px, 100%);
        padding: 24px;
      }
    `,
  ],
})
export class InvestorComponent {}
