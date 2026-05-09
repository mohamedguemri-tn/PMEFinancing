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
import { WalletService } from '../../services/wallet.service';
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
  ethBalance = '—';
  private subscription = new Subscription();
  private balanceInterval?: ReturnType<typeof setInterval>;

  constructor(
    private authService: AuthService,
    private walletService: WalletService,
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

    // Get current user, set navigation, and load balance
    this.subscription.add(
      this.currentUser$.subscribe(user => {
        if (user) {
          this.setNavigationForRole(user.role);
          this.refreshBalance(user.walletAddress);
          clearInterval(this.balanceInterval);
          this.balanceInterval = setInterval(() => this.refreshBalance(user.walletAddress), 30000);
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
    clearInterval(this.balanceInterval);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  private setNavigationForRole(role: string): void {
    const baseItems: NavItem[] = [
      { label: 'Dashboard', icon: 'dashboard', route: `/${role.toLowerCase()}/dashboard` }
    ];

    let roleItems: NavItem[] = [];

    switch (role.toUpperCase()) {
      case 'PME':
        roleItems = [
          { label: 'My assets', icon: 'inventory_2', route: '/pme/assets' },
          { label: 'Financing', icon: 'payments', route: '/pme/financing' },
        ];
        break;
      case 'INVESTOR':
        roleItems = [
          { label: 'Loan marketplace', icon: 'account_balance', route: '/investor/marketplace' },
          { label: 'My investments', icon: 'trending_up', route: '/investor/investments' },
        ];
        break;
      case 'GUARANTOR':
        roleItems = [
          { label: 'My guarantees', icon: 'verified_user', route: '/guarantor/guarantees' },
        ];
        break;
      case 'GOVERNOR':
        roleItems = [
          { label: 'Registrations', icon: 'group', route: '/governor/registrations', badge: 5 },
          { label: 'Access rights', icon: 'key', route: '/governor/access' },
          { label: 'Parameters', icon: 'tune', route: '/governor/parameters' },
          { label: 'Audit log', icon: 'list_alt', route: '/governor/audit' }
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

  private refreshBalance(address: string): void {
    this.walletService.getBalance(address)
      .then(bal => this.ethBalance = bal)
      .catch(() => {});
  }
}
