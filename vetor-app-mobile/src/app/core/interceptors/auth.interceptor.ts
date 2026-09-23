import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, from, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';
import { TokenService, Tokens } from '../services/token.service';

/** Rotas de auth que não levam Bearer nem disparam refresh em 401. */
const ROTAS_SEM_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

/** Refresh em andamento, compartilhado entre requisições que tomarem 401 ao mesmo tempo. */
let refreshEmAndamento: Observable<string> | null = null;

function comBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Injeta o access token nas chamadas à API e, em 401, tenta um refresh (uma vez) antes de repetir a
 * requisição. Offline-first: só encerra a sessão se o servidor RECUSAR o refresh (401/400) — falha de rede
 * no refresh mantém tokens e sessão, e o erro volta pra quem chamou (a fila tenta de novo depois).
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
  const router = inject(Router);
  // SessionService resolvido só na hora do uso, pra não criar dependência circular quando ele passar a usar HttpClient
  const injector = inject(Injector);

  return from(tokens.ready).pipe(
    switchMap(() => next(comBearer(req, tokens.accessToken))),
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !tokens.refreshToken) {
        return throwError(() => err);
      }

      refreshEmAndamento ??= http
        .post<Tokens>(`${environment.apiUrl}/auth/refresh`, { refreshToken: tokens.refreshToken })
        .pipe(
          switchMap((novos) =>
            from(tokens.set({ accessToken: novos.accessToken, refreshToken: novos.refreshToken })).pipe(
              map(() => novos.accessToken),
            ),
          ),
          catchError((refreshErr: unknown) => {
            const recusado =
              refreshErr instanceof HttpErrorResponse && (refreshErr.status === 401 || refreshErr.status === 400);
            if (recusado) {
              void tokens.clear();
              void injector.get(SessionService).logout();
              void router.navigateByUrl('/login');
            }
            return throwError(() => refreshErr);
          }),
          finalize(() => (refreshEmAndamento = null)),
          shareReplay(1),
        );

      return refreshEmAndamento.pipe(switchMap((access) => next(comBearer(req, access))));
    }),
  );
};
