import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  while (session.restoring()) {
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  if (session.session()) {
    return true;
  }
  return router.parseUrl('/login');
};
