import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: UserRole[] = route.data['roles'] ?? [];
  const userRole = authService.userRole();

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // Redirect to correct dashboard if authenticated but wrong role
  if (authService.isAuthenticated()) {
    authService.redirectByRole();
    return false;
  }

  return router.createUrlTree(['/auth/login']);
};
