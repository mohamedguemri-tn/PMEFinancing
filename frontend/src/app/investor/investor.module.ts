import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AppShellComponent } from '../core/components/app-shell/app-shell.component';
import { InvestorComponent } from './investor.component';
import { InvestorMarketplaceComponent } from './investor-marketplace.component';
import { InvestorInvestmentsComponent } from './investor-investments.component';

const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: InvestorComponent, data: { title: 'Dashboard' } },
      { path: 'marketplace', component: InvestorMarketplaceComponent, data: { title: 'Loan marketplace' } },
      { path: 'investments', component: InvestorInvestmentsComponent, data: { title: 'Investments' } },
    ]
  }
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes), InvestorComponent, InvestorMarketplaceComponent, InvestorInvestmentsComponent, AppShellComponent],
})
export class InvestorModule {}