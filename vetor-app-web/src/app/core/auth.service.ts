import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';
import { TokenService, Tokens } from './token.service';

export interface LoginResult {
  emailErr: string;
  passErr: string;
  credErr: boolean;
  /** Falha que não é de credencial (API fora do ar, papel sem acesso ao painel). */
  apiErr: string;
}

/** Usuário como devolvido por POST /auth/login e GET /auth/me. */
export interface UsuarioSessao {
  id: string;
  papel: 'ROOT' | 'ADMIN' | 'MOTORISTA';
  empresaId: string | null;
  nome: string;
  login: string;
}

interface LoginResponse extends Tokens {
  usuario: UsuarioSessao;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokens = inject(TokenService);
  private toast = inject(ToastService);

  /** Sessão restaurada do localStorage: se o access expirou, o interceptor renova na primeira chamada. */
  readonly loggedIn = signal(!!this.tokens.refreshToken);
  readonly authenticating = signal(false);
  readonly usuario = signal<UsuarioSessao | null>(null);

  constructor() {
    if (this.loggedIn()) {
      // valida a sessão restaurada; se o refresh estiver revogado, o interceptor encerra e manda pra /login
      firstValueFrom(this.http.get<UsuarioSessao>(`${environment.apiUrl}/auth/me`)).then(
        (u) => this.usuario.set(u),
        () => {},
      );
    }
  }

  async login(email: string, pass: string): Promise<LoginResult> {
    const emailErr = !email ? 'Informe o e-mail da conta' : !email.includes('@') ? 'E-mail inválido — confira o formato' : '';
    const passErr = !pass ? 'Informe a senha' : '';
    if (emailErr || passErr) {
      return { emailErr, passErr, credErr: false, apiErr: '' };
    }

    this.authenticating.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { login: email, senha: pass }),
      );
      if (res.usuario.papel !== 'ADMIN') {
        // painel é do gestor da empresa; motorista usa o app, root não tem empresa
        this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: res.refreshToken }).subscribe({ error: () => {} });
        return { emailErr: '', passErr: '', credErr: false, apiErr: 'Este acesso é exclusivo do administrador da empresa.' };
      }
      this.tokens.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      this.usuario.set(res.usuario);
      this.loggedIn.set(true);
      this.toast.show(`Bem-vindo de volta, ${res.usuario.nome}`, 'info');
      return { emailErr: '', passErr: '', credErr: false, apiErr: '' };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return { emailErr: '', passErr: '', credErr: true, apiErr: '' };
      }
      return { emailErr: '', passErr: '', credErr: false, apiErr: 'Não foi possível conectar ao servidor. Tente novamente.' };
    } finally {
      this.authenticating.set(false);
    }
  }

  /** Revoga o refresh token na API (sem esperar a resposta) e encerra a sessão local. */
  logout(): void {
    const refreshToken = this.tokens.refreshToken;
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.encerrarSessaoLocal();
  }

  /** Limpa tokens e estado sem falar com a API — usado quando o próprio refresh falhou. */
  encerrarSessaoLocal(): void {
    this.tokens.clear();
    this.usuario.set(null);
    this.loggedIn.set(false);
  }
}
