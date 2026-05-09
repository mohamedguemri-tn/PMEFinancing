import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const user = authService.currentUser;
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    router.navigate([`/${user.role.toLowerCase()}`]);
    return false;
  }

  return true;
};

export const roleGuard = (requiredRole: string): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUser;

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    if (user.role !== requiredRole) {
      router.navigate([`/${user.role.toLowerCase()}`]);
      return false;
    }

    return true;
  };
};
