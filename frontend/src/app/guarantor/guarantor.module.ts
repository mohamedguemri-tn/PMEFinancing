import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AppShellComponent } from '../core/components/app-shell/app-shell.component';
import { GuarantorDashboardComponent } from './guarantor-dashboard.component';
import { GuarantorGuaranteesComponent } from './guarantor-guarantees.component';
import { GuarantorAssetsComponent } from './guarantor-assets.component';
import { GuarantorMarketplaceComponent } from './guarantor-marketplace.component';
import { GuarantorBackedLoansComponent } from './guarantor-backed-loans.component';

const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: GuarantorDashboardComponent, data: { title: 'Dashboard' } },
      { path: 'assets', component: GuarantorAssetsComponent, data: { title: 'My assets' } },
      { path: 'marketplace', component: GuarantorMarketplaceComponent, data: { title: 'Loan marketplace' } },
      { path: 'backed-loans', component: GuarantorBackedLoansComponent, data: { title: 'Backed loans' } },
      { path: 'guarantees', component: GuarantorGuaranteesComponent, data: { title: 'My guarantees' } },
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    AppShellComponent,
    GuarantorDashboardComponent,
    GuarantorGuaranteesComponent,
    GuarantorAssetsComponent,
    GuarantorMarketplaceComponent,
    GuarantorBackedLoansComponent,
  ],
})
export class GuarantorModule {}
