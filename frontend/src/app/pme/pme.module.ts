import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PmeComponent } from './pme.component';
import { PmeAssetsComponent } from './pme-assets.component';
import { PmeFinancingComponent } from './pme-financing.component';
import { AppShellComponent } from '../core/components/app-shell/app-shell.component';

const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PmeComponent, data: { title: 'Dashboard' } },
      { path: 'assets', component: PmeAssetsComponent, data: { title: 'Assets' } },
      { path: 'financing', component: PmeFinancingComponent, data: { title: 'Financing' } },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes), PmeComponent, PmeAssetsComponent, PmeFinancingComponent, AppShellComponent],
})
export class PmeModule {}