import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

function dashboardUrl(role: string): string[] {
  return [`/${role.toLowerCase()}/dashboard`];
}

/** Blocks unauthenticated access; redirects to /login */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};

/** Blocks authenticated users from public pages (login, register); sends them to their dashboard */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const user = authService.currentUser;
    return router.createUrlTree(user ? dashboardUrl(user.role) : ['/login']);
  }
  return true;
};

/** Root path: dashboard if logged in, login otherwise */
export const rootGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const user = authService.currentUser;
    return router.createUrlTree(user ? dashboardUrl(user.role) : ['/login']);
  }
  return router.createUrlTree(['/login']);
};

/** Ensures the user has the required role; redirects to their own dashboard otherwise */
export const roleGuard = (requiredRole: string): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUser;

    if (!user) return router.createUrlTree(['/login']);
    if (user.role !== requiredRole) return router.createUrlTree(dashboardUrl(user.role));
    return true;
  };
};
