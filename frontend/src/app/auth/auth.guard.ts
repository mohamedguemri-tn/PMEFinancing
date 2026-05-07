import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletService } from './wallet.service';

export const authGuard: CanActivateFn = (route, state) => {
  const walletService = inject(WalletService);
  const router = inject(Router);
  const user = walletService.currentUser;
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!user) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
