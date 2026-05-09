import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';

interface GuaranteeSummary {
  assetName: string;
  linkedPme: string;
  status: string;
  valueEth: number;
  expirationDate: string;
}

@Component({
  selector: 'app-guarantor-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatDividerModule, SharedModule],
  template: `
    <div class="dashboard-shell">
      <section class="stats-row">
        <app-stat-card label="Total assets provided" [value]="totalAssets"></app-stat-card>
        <app-stat-card label="Assets in use as collateral" [value]="assetsInUse"></app-stat-card>
        <app-stat-card
          label="Total value guaranteed"
          [value]="(totalValueGuaranteed | number:'1.2-2') + ' ETH'"
        ></app-stat-card>
      </section>

      <section *ngIf="expiringSoonCount > 0" class="alert-banner">
        <mat-icon class="alert-icon">warning</mat-icon>
        <div>
          <strong>{{ expiringSoonCount }} guarantee(s) expiring soon</strong> — review them before they lapse.
        </div>
      </section>

      <section class="table-section">
        <div class="table-header">
          <div>
            <h2>My guarantees</h2>
            <p class="subtitle">Latest five guarantees tracked for your portfolio.</p>
          </div>
          <button mat-button color="primary" (click)="viewAll()">View all →</button>
        </div>

        <app-empty-state
          *ngIf="recentGuarantees.length === 0"
          icon="verified_user"
          title="No guarantees yet"
          subtitle="Add assets to start providing guarantees."
          buttonLabel="Add asset"
          (buttonClick)="viewAll()"
        ></app-empty-state>

        <mat-card *ngIf="recentGuarantees.length > 0">
          <table mat-table [dataSource]="recentGuarantees" class="mat-elevation-z0">
            <ng-container matColumnDef="asset">
              <th mat-header-cell *matHeaderCellDef>Asset</th>
              <td mat-cell *matCellDef="let item">{{ item.assetName }}</td>
            </ng-container>
            <ng-container matColumnDef="linkedPme">
              <th mat-header-cell *matHeaderCellDef>Linked PME</th>
              <td mat-cell *matCellDef="let item">{{ item.linkedPme }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item">
                <app-status-badge [status]="item.status"></app-status-badge>
              </td>
            </ng-container>
            <ng-container matColumnDef="value">
              <th mat-header-cell *matHeaderCellDef>Value</th>
              <td mat-cell *matCellDef="let item">{{ item.valueEth | number:'1.2-2' }} ETH</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-shell {
      display: grid;
      gap: var(--space-5);
      padding: var(--space-5);
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
    }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: 0.5px solid var(--color-warning);
      background: var(--color-warning-bg);
      border-radius: var(--radius-md);
      color: var(--color-warning);
      font-size: var(--font-size-base);
    }

    .alert-icon {
      font-size: var(--icon-md);
      color: var(--color-warning);
      flex-shrink: 0;
    }

    .table-section {
      display: grid;
      gap: var(--space-3);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-4);
    }

    .table-header h2 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .subtitle {
      margin-top: var(--space-1);
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
    }

    table { width: 100%; }
    mat-card { padding: 0 !important; }
  `],
})
export class GuarantorDashboardComponent implements OnInit {
  totalAssets = 0;
  assetsInUse = 0;
  totalValueGuaranteed = 0;
  recentGuarantees: GuaranteeSummary[] = [];
  expiringSoonCount = 0;
  displayedColumns = ['asset', 'linkedPme', 'status', 'value'];

  private http = inject(HttpClient);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadDashboard();
  }

  viewAll(): void {
    this.router.navigate(['/guarantor/guarantees']);
  }

  private loadDashboard(): void {
    this.http.get<GuaranteeSummary[]>(`${environment.apiUrl}/guarantor/guarantees/dashboard`).subscribe({
      next: (items) => {
        this.recentGuarantees = items.slice(0, 5);
        this.totalAssets = items.length;
        this.assetsInUse = items.filter((i) => i.status.toUpperCase() === 'COLLATERAL').length;
        this.totalValueGuaranteed = items.reduce((sum, i) => sum + i.valueEth, 0);
        this.expiringSoonCount = items.filter((i) => {
          const days = this.daysUntil(i.expirationDate);
          return days >= 0 && days <= 7;
        }).length;
      },
      error: () => { this.recentGuarantees = []; },
    });
  }

  private daysUntil(dateString: string): number {
    const diff = new Date(dateString).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
