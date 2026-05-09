import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter, map, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SharedModule } from '../../../shared/shared.module';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    SharedModule
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  currentUser$ = this.authService.getCurrentUser();
  isMobile = false;
  pageTitle = '';
  navItems: NavItem[] = [];
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    // Observe screen size
    this.subscription.add(
      this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
        this.isMobile = result.matches;
        if (!this.isMobile) {
          this.sidenav?.open();
        } else {
          this.sidenav?.close();
        }
      })
    );

    // Get current user and set navigation
    this.subscription.add(
      this.currentUser$.subscribe(user => {
        if (user) {
          this.setNavigationForRole(user.role);
        }
      })
    );

    // Set page title from route data
    this.subscription.add(
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          map(() => this.getCurrentRouteTitle())
        )
        .subscribe(title => {
          this.pageTitle = title || 'Dashboard';
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
  }

  logout(): void {
    this.authService.logout();
  }

  private setNavigationForRole(role: string): void {
    const baseItems: NavItem[] = [
      { label: 'Dashboard', icon: 'ti-layout-dashboard', route: `/${role.toLowerCase()}/dashboard` }
    ];

    let roleItems: NavItem[] = [];

    switch (role.toUpperCase()) {
      case 'PME':
        roleItems = [
          { label: 'My assets', icon: 'ti-box', route: '/pme/assets' },
          { label: 'Financing', icon: 'ti-cash', route: '/pme/financing' },
          { label: 'Repayments', icon: 'ti-receipt', route: '/pme/repayments' },
          { label: 'History', icon: 'ti-history', route: '/pme/history' }
        ];
        break;
      case 'INVESTOR':
        roleItems = [
          { label: 'Loan marketplace', icon: 'ti-building-bank', route: '/investor/marketplace' },
          { label: 'My investments', icon: 'ti-chart-line', route: '/investor/investments' },
          { label: 'Repayments', icon: 'ti-receipt', route: '/investor/repayments' }
        ];
        break;
      case 'GUARANTOR':
        roleItems = [
          { label: 'My guarantees', icon: 'ti-shield-check', route: '/guarantor/guarantees' },
          { label: 'Asset registry', icon: 'ti-box', route: '/guarantor/assets' }
        ];
        break;
      case 'GOVERNOR':
        roleItems = [
          { label: 'Registrations', icon: 'ti-users', route: '/governor/registrations', badge: 5 }, // Mock badge
          { label: 'Access rights', icon: 'ti-key', route: '/governor/access' },
          { label: 'Parameters', icon: 'ti-settings-2', route: '/governor/parameters' },
          { label: 'Audit log', icon: 'ti-list', route: '/governor/audit' }
        ];
        break;
    }

    this.navItems = [...baseItems, ...roleItems];
  }

  private getCurrentRouteTitle(): string {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data['title'] || '';
  }

  truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
