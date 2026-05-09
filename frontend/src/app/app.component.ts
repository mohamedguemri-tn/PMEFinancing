import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DebugPanelComponent } from './core/debug/debug-panel.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, DebugPanelComponent],
  template: `
    <router-outlet></router-outlet>
    <app-debug-panel *ngIf="isDev"></app-debug-panel>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `],
})
export class AppComponent {
  isDev = !environment.production && environment.development;
}

