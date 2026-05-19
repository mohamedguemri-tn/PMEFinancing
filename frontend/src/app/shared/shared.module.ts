import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { RoleBadgeComponent } from './components/role-badge/role-badge.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { TxFeedbackComponent } from './components/tx-feedback/tx-feedback.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { LoadingOrEmptyComponent } from './loading-or-empty.component';

@NgModule({
  declarations: [
    RoleBadgeComponent,
    StatusBadgeComponent,
    TxFeedbackComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    StatCardComponent,
    EmptyStateComponent,
    LoadingOrEmptyComponent,
  ],
  exports: [
    /* Angular & Router */
    CommonModule,
    RouterModule,
    /* Material re-exports */
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    /* Shared components */
    RoleBadgeComponent,
    StatusBadgeComponent,
    TxFeedbackComponent,
    StatCardComponent,
    EmptyStateComponent,
    LoadingOrEmptyComponent,
  ],
})
export class SharedModule {}
