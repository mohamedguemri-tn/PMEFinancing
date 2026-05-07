import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <span>SME Financing Platform</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/login">Login</a>
      <a mat-button routerLink="/pme">PME</a>
      <a mat-button routerLink="/investor">Investor</a>
      <a mat-button routerLink="/governor">Governor</a>
    </mat-toolbar>

    <main class="app-main">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .app-main {
      padding: 24px;
    }
  `],
})
export class AppComponent {}
