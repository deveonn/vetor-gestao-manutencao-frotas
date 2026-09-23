import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TokenService, Tokens } from './token.service';

/** Rotas de auth que não levam Bearer nem disparam refresh em 401. */
const ROTAS_SEM_REFRESH = ['/auth/login', '/auth/refresh'];

/** Refresh em andamento, compartilhado entre requisições que tomarem 401 ao mesmo tempo. */
let refreshEmAndamento: Observable<string> | null = null;

function comBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Injeta o access token nas chamadas à API e, em 401, tenta um refresh (uma vez) antes de
 * repetir a requisição. Se o refresh falhar, limpa a sessão e manda para /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const rota = req.url.slice(environment.apiUrl.length);
  if (ROTAS_SEM_REFRESH.some((r) => rota.startsWith(r))) {
    return next(req);
  }

  const tokens = inject(TokenService);
  const http = inject(HttpClient);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(comBearer(req, tokens.accessToken)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !tokens.refreshToken) {
        return throwError(() => err);
      }

      refreshEmAndamento ??= http
        .post<Tokens>(`${environment.apiUrl}/auth/refresh`, { refreshToken: tokens.refreshToken })
        .pipe(
          map((novos) => {
            tokens.set({ accessToken: novos.accessToken, refreshToken: novos.refreshToken });
            return novos.accessToken;
          }),
          catchError((refreshErr: unknown) => {
            tokens.clear();
            auth.logout();
            router.navigateByUrl('/login');
            return throwError(() => refreshErr);
          }),
          finalize(() => (refreshEmAndamento = null)),
          shareReplay(1),
        );

      return refreshEmAndamento.pipe(switchMap((access) => next(comBearer(req, access))));
    }),
  );
};
