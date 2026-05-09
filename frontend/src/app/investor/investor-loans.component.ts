import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BehaviorSubject, firstValueFrom, interval, Subscription, switchMap, startWith } from 'rxjs';
import { WalletService } from '../auth/wallet.service';
import { environment } from '../../environments/environment';
import { LoanFilterPipe } from './loan-filter.pipe';
import { FundLoanDialogComponent } from './fund-loan-dialog.component';
import { ThemeService } from '../core/services/theme.service';

export interface Loan {
  id: string;
  smeWallet: string;
  amount: number;
  collateralAssetName: string;
  durationDays: number;
  status: 'REQUESTED' | 'FUNDED' | 'REPAID' | 'DEFAULTED';
  fundedAmount?: number;
  repaidAmount?: number;
}

@Component({
  selector: 'app-investor-loans',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
    NgChartsModule,
    LoanFilterPipe,
  ],
  template: `
    <div class="loans-container">
      <h2>Investor Dashboard</h2>
      <p>Wallet Balance: {{ balance$ | async }} ETH</p>

      <mat-tab-group>
        <mat-tab label="Available Loans">
          <div class="loans-grid">
            <mat-card *ngFor="let loan of ((loans$ | async) ?? []) | loanFilter:'REQUESTED'" class="loan-card">
              <mat-card-header>
                <mat-card-title>{{ loan.collateralAssetName }}</mat-card-title>
                <mat-card-subtitle>SME: {{ loan.smeWallet | slice:0:10 }}...</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Amount: {{ loan.amount }} ETH</p>
                <p>Duration: {{ loan.durationDays }} days</p>
                <mat-chip [color]="getStatusColor(loan.status)" selected>{{ loan.status }}</mat-chip>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" (click)="openFundDialog(loan)">Fund</button>
              </mat-card-actions>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="My Investments">
          <div class="investments-list">
            <mat-card *ngFor="let loan of ((loans$ | async) ?? []) | loanFilter:'FUNDED'" class="investment-card">
              <mat-card-header>
                <mat-card-title>{{ loan.collateralAssetName }}</mat-card-title>
                <mat-card-subtitle>SME: {{ loan.smeWallet | slice:0:10 }}...</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Funded: {{ loan.fundedAmount }} ETH</p>
                <p>Repaid: {{ loan.repaidAmount || 0 }} ETH</p>
                <mat-progress-bar
                  mode="determinate"
                  [value]="getRepaymentProgress(loan)">
                </mat-progress-bar>
                <p>{{ getRepaymentProgress(loan) }}% repaid</p>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="Portfolio Summary">
          <div class="chart-container">
            <canvas baseChart
                    [data]="pieChartData"
                    [type]="pieChartType"
                    [options]="pieChartOptions">
            </canvas>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .loans-container {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-5);
      }

      .loans-container h2 {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .loans-container > p {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
      }

      .loans-grid, .investments-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--space-4);
        padding-top: var(--space-4);
      }

      .loan-card, .investment-card {
        max-width: 340px;
      }

      .chart-container {
        width: min(400px, 100%);
        height: 320px;
        margin: var(--space-5) auto 0;
      }

      mat-chip {
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    `,
  ],
})
export class InvestorLoansComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private walletService = inject(WalletService);
  private themeService = inject(ThemeService);

  loans$ = new BehaviorSubject<Loan[]>([]);
  balance$ = new BehaviorSubject<string>('0');
  private pollingSubscription?: Subscription;

  // Pie chart
  public pieChartType: ChartType = 'pie';
  public pieChartData: ChartData<'pie'> = {
    labels: ['Requested', 'Funded', 'Repaid', 'Defaulted'],
    datasets: [{ 
      data: [0, 0, 0, 0],
      backgroundColor: [
        this.themeService.getColor('--color-primary'),
        this.themeService.getColor('--color-governor'),
        this.themeService.getColor('--color-success'),
        this.themeService.getColor('--color-danger')
      ]
    }],
  };
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  ngOnInit(): void {
    this.loadBalance();
    this.startPolling();
    this.updateChartColors();
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  private updateChartColors(): void {
    this.pieChartData.datasets[0].backgroundColor = [
      this.themeService.getColor('--color-primary'),
      this.themeService.getColor('--color-governor'),
      this.themeService.getColor('--color-success'),
      this.themeService.getColor('--color-danger')
    ];
  }

  private loadLoans(): void {
    this.http.get<Loan[]>(`${environment.apiUrl}/loans`).subscribe({
      next: (loans) => {
        this.loans$.next(loans);
        this.updateChartData(loans);
      },
      error: () => this.snackBar.open('Failed to load loans', 'Close', { duration: 3000 }),
    });
  }

  private loadBalance(): void {
    this.walletService.getBalance().then(balance => this.balance$.next(balance)).catch(() => {});
  }

  private startPolling(): void {
    this.pollingSubscription = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.http.get<Loan[]>(`${environment.apiUrl}/loans`))
    ).subscribe({
      next: (loans) => {
        this.loans$.next(loans);
        this.updateChartData(loans);
      },
      error: () => {},
    });
  }

  openFundDialog(loan: Loan): void {
    const dialogRef = this.dialog.open(FundLoanDialogComponent, {
      width: '400px',
      data: loan,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.fundLoan(loan);
      }
    });
  }

  private async fundLoan(loan: Loan): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/loans/${loan.id}/fund`, {}));

      const txHash = await this.walletService.sendEth(environment.contractAddress, loan.amount.toString());
      await this.walletService.confirmTransaction(txHash);

      this.snackBar.open('Loan funded successfully', 'Close', { duration: 3000 });
      this.loadLoans();
    } catch (error) {
      this.snackBar.open('Funding failed', 'Close', { duration: 3000 });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'REQUESTED': return 'primary';
      case 'FUNDED': return 'accent';
      case 'REPAID': return 'primary';
      case 'DEFAULTED': return 'warn';
      default: return '';
    }
  }

  getRepaymentProgress(loan: Loan): number {
    if (!loan.fundedAmount) return 0;
    return ((loan.repaidAmount || 0) / loan.fundedAmount) * 100;
  }

  private updateChartData(loans: Loan[]): void {
    const counts = {
      REQUESTED: 0,
      FUNDED: 0,
      REPAID: 0,
      DEFAULTED: 0,
    };
    loans.forEach(loan => counts[loan.status]++);
    this.pieChartData.datasets[0].data = [
      counts.REQUESTED,
      counts.FUNDED,
      counts.REPAID,
      counts.DEFAULTED,
    ];
  }
}