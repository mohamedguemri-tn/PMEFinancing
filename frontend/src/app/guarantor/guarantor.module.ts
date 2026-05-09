import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AppShellComponent } from '../core/components/app-shell/app-shell.component';
import { GuarantorDashboardComponent } from './guarantor-dashboard.component';
import { GuarantorGuaranteesComponent } from './guarantor-guarantees.component';

const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: GuarantorDashboardComponent, data: { title: 'Dashboard' } },
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
  ],
})
export class GuarantorModule {}
