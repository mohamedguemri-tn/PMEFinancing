import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartType } from 'chart.js';
import { environment } from '../../environments/environment';
import { SharedModule } from '../shared/shared.module';
import { ThemeService } from '../core/services/theme.service';

interface InvestmentActivity {
  id: string;
  smeName: string;
  amount: number;
  date: string;
  status: string;
}

@Component({
  selector: 'app-investor',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatListModule, NgChartsModule, SharedModule],
  template: `
    <div class="investor-dashboard">
      <section class="stats-row">
        <app-stat-card
          label="Total invested"
          [value]="(totalInvested | number:'1.2-2') + ' ETH'"
        ></app-stat-card>
        <app-stat-card
          label="Active loans"
          [value]="activeLoans"
        ></app-stat-card>
        <app-stat-card
          label="Average return rate"
          [value]="(averageReturnRate | number:'1.1-1') + '%'"
          color="success"
        ></app-stat-card>
      </section>

      <section class="chart-card">
        <mat-card>
          <div class="chart-header">
            <h3>Portfolio by status</h3>
          </div>
          <div class="chart-container">
            <canvas baseChart
                    [data]="doughnutChartData"
                    [type]="doughnutChartType"
                    [options]="doughnutChartOptions">
            </canvas>
          </div>
          <div class="status-list">
            <div class="status-item">
              <span class="status-dot dot-primary"></span>
              <span>FUNDED</span>
            </div>
            <div class="status-item">
              <span class="status-dot dot-success"></span>
              <span>REPAID</span>
            </div>
            <div class="status-item">
              <span class="status-dot dot-danger"></span>
              <span>DEFAULTED</span>
            </div>
          </div>
        </mat-card>
      </section>

      <section class="activity-card">
        <mat-card>
          <div class="card-heading">
            <h3>Recent activity</h3>
          </div>
          <app-empty-state
            *ngIf="recentActivity.length === 0"
            icon="trending_up"
            title="No activity yet"
            subtitle="Your funded loans will appear here."
          ></app-empty-state>
          <mat-list *ngIf="recentActivity.length > 0">
            <mat-list-item *ngFor="let activity of recentActivity">
              <div class="activity-row">
                <div>
                  <div class="activity-title">{{ activity.smeName }}</div>
                  <div class="activity-meta">{{ activity.date }}</div>
                </div>
                <div class="activity-right">
                  <div class="activity-amount">{{ activity.amount | number:'1.2-2' }} ETH</div>
                  <app-status-badge [status]="activity.status"></app-status-badge>
                </div>
              </div>
            </mat-list-item>
          </mat-list>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .investor-dashboard {
      padding: var(--space-5);
      display: grid;
      gap: var(--space-5);
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
    }

    .chart-card { display: grid; }

    .chart-header {
      padding: var(--space-4) var(--space-4) 0;
    }
    .chart-header h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .chart-container {
      width: min(280px, 100%);
      margin: var(--space-3) auto 0;
      padding: 0 var(--space-4);
    }

    .status-list {
      display: flex;
      justify-content: center;
      gap: var(--space-5);
      padding: var(--space-4);
      border-top: 0.5px solid var(--color-border);
      margin-top: var(--space-3);
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .dot-primary { background: var(--color-primary); }
    .dot-success { background: var(--color-success); }
    .dot-danger  { background: var(--color-danger);  }

    .activity-card { display: grid; }

    .card-heading {
      padding: var(--space-4) var(--space-4) 0;
    }
    .card-heading h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .activity-row {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-4);
    }

    .activity-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .activity-meta {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .activity-right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .activity-amount {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }
  `],
})
export class InvestorComponent implements OnInit {
  totalInvested = 0;
  activeLoans = 0;
  averageReturnRate = 0;
  recentActivity: InvestmentActivity[] = [];

  private themeService = inject(ThemeService);

  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['FUNDED', 'REPAID', 'DEFAULTED'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        this.themeService.getColor('--color-primary'),
        this.themeService.getColor('--color-success'),
        this.themeService.getColor('--color-danger'),
      ],
      borderWidth: 0,
    }],
  };

  public doughnutChartOptions: any = {
    responsive: true,
    cutout: '70%',
    plugins: { legend: { display: false } },
  };

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadDashboard();
    this.updateChartColors();
  }

  private updateChartColors(): void {
    this.doughnutChartData.datasets[0].backgroundColor = [
      this.themeService.getColor('--color-primary'),
      this.themeService.getColor('--color-success'),
      this.themeService.getColor('--color-danger'),
    ];
  }

  private loadDashboard(): void {
    this.http.get<InvestmentActivity[]>(`${environment.apiUrl}/loans/portfolio`).subscribe({
      next: (activities) => {
        this.recentActivity = activities.slice(0, 5);
        const counts: Record<string, number> = { FUNDED: 0, REPAID: 0, DEFAULTED: 0 };
        let totalInvested = 0;

        activities.forEach((activity) => {
          if (activity.status in counts) counts[activity.status]++;
          totalInvested += activity.amount;
        });

        this.totalInvested = totalInvested;
        this.activeLoans = activities.filter((a) => a.status === 'FUNDED').length;
        this.averageReturnRate = 0;
        // Replacing the whole object reference triggers ng2-charts ngOnChanges;
        // mutating datasets[0].data in place does not.
        this.doughnutChartData = {
          labels: ['FUNDED', 'REPAID', 'DEFAULTED'],
          datasets: [{
            data: [counts['FUNDED'], counts['REPAID'], counts['DEFAULTED']],
            backgroundColor: [
              this.themeService.getColor('--color-primary'),
              this.themeService.getColor('--color-success'),
              this.themeService.getColor('--color-danger'),
            ],
            borderWidth: 0,
          }],
        };
      },
      error: () => { this.recentActivity = []; },
    });
  }
}
