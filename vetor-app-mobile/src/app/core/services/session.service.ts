import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Session } from '../models/session.model';
import { TokenService, Tokens } from './token.service';

const SESSION_KEY = 'vetor.session';

/** Usuário como devolvido por POST /auth/login e GET /auth/me. */
interface UsuarioApi {
  papel: 'ROOT' | 'ADMIN' | 'MOTORISTA';
  nome: string;
  login: string;
}

export type LoginResult = { ok: true } | { ok: false; error: string };

function paraSessao(u: UsuarioApi, loginAt: string): Session {
  return {
    username: u.login,
    displayName: u.nome.trim().split(/\s+/)[0].toLowerCase(),
    nome: u.nome,
    loginAt,
  };
}

/**
 * Sessão do motorista. Offline-first: a sessão salva no Preferences vale para reabrir o app sem internet;
 * com rede, GET /auth/me confirma em segundo plano (se o servidor recusar, o interceptor encerra a sessão).
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private tokens = inject(TokenService);

  readonly session = signal<Session | null>(null);
  readonly restoring = signal(true);

  constructor() {
    this.restore();
  }

  private async restore(): Promise<void> {
    const [{ value }] = await Promise.all([Preferences.get({ key: SESSION_KEY }), this.tokens.ready]);
    if (value && this.tokens.refreshToken) {
      const cached = JSON.parse(value) as Session;
      this.session.set(cached);
      this.revalidar(cached);
    } else if (value) {
      // sessão sem token = sessão da época do login simulado: não vale mais
      await Preferences.remove({ key: SESSION_KEY });
    }
    this.restoring.set(false);
  }

  /** Confirma a sessão restaurada e atualiza o nome; sem rede, mantém a sessão salva como está. */
  private async revalidar(cached: Session): Promise<void> {
    try {
      const usuario = await firstValueFrom(this.http.get<UsuarioApi>(`${environment.apiUrl}/auth/me`));
      await this.salvar(paraSessao(usuario, cached.loginAt));
    } catch {
      // 401 com refresh recusado: o interceptor já encerrou a sessão. Erro de rede: segue offline.
    }
  }

  async login(username: string, password: string): Promise<LoginResult> {
    if (!username.trim() || !password.trim()) {
      return { ok: false, error: 'preencha usuário e senha para entrar.' };
    }
    try {
      const res = await firstValueFrom(
        this.http.post<Tokens & { usuario: UsuarioApi }>(`${environment.apiUrl}/auth/login`, {
          login: username.trim(),
          senha: password,
        }),
      );
      if (res.usuario.papel !== 'MOTORISTA') {
        // conta de gestor: revoga o refresh emitido e manda pro painel
        this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: res.refreshToken }).subscribe({ error: () => {} });
        return { ok: false, error: 'este app é para motoristas. gestores usam o painel web.' };
      }
      await this.tokens.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      await this.salvar(paraSessao(res.usuario, new Date().toISOString()));
      return { ok: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return { ok: false, error: 'usuário ou senha inválidos.' };
      }
      if (err instanceof HttpErrorResponse && err.status === 0) {
        return { ok: false, error: 'sem internet. o primeiro acesso neste celular precisa de conexão.' };
      }
      return { ok: false, error: 'não foi possível entrar agora. tente de novo.' };
    }
  }

  hasCachedSession(): boolean {
    return this.session() !== null;
  }

  /** Revoga o refresh no servidor se houver rede (sem esperar) e sempre limpa a sessão local. */
  async logout(): Promise<void> {
    const refreshToken = this.tokens.refreshToken;
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    await this.tokens.clear();
    this.session.set(null);
    await Preferences.remove({ key: SESSION_KEY });
  }

  private async salvar(session: Session): Promise<void> {
    this.session.set(session);
    await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
  }
}
