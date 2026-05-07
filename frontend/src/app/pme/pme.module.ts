import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PmeAssetsComponent } from './pme-assets.component';

const routes: Routes = [
  {
    path: '',
    component: PmeAssetsComponent,
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes), PmeAssetsComponent],
})
export class PmeModule {}