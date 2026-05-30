import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AppShellComponent } from '../core/components/app-shell/app-shell.component';
import { GovernorDashboardComponent } from './governor-dashboard.component';
import { GovernorRegistrationsComponent } from './governor-registrations.component';
import { GovernorAccessComponent } from './governor-access.component';
import { GovernorParametersComponent } from './governor-parameters.component';
import { GovernorAuditComponent } from './governor-audit.component';
import { GovernorOverdueLoansComponent } from './governor-overdue-loans.component';

const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: GovernorDashboardComponent, data: { title: 'Dashboard' } },
      { path: 'registrations', component: GovernorRegistrationsComponent, data: { title: 'Registration requests' } },
      { path: 'overdue-loans', component: GovernorOverdueLoansComponent, data: { title: 'Overdue loans' } },
      { path: 'access', component: GovernorAccessComponent, data: { title: 'Access rights' } },
      { path: 'parameters', component: GovernorParametersComponent, data: { title: 'Platform parameters' } },
      { path: 'audit', component: GovernorAuditComponent, data: { title: 'Audit log' } },
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    AppShellComponent,
    GovernorDashboardComponent,
    GovernorRegistrationsComponent,
    GovernorOverdueLoansComponent,
    GovernorAccessComponent,
    GovernorParametersComponent,
    GovernorAuditComponent,
  ],
})
export class GovernorModule {}