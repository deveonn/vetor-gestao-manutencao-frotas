import { Injectable } from '@angular/core';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'vetor.tokens';

/** Guarda o par access/refresh da API em localStorage, para a sessão sobreviver a um reload. */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private tokens: Tokens | null = this.ler();

  get accessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.tokens?.refreshToken ?? null;
  }

  set(tokens: Tokens): void {
    this.tokens = tokens;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // storage indisponível (aba anônima, bloqueado): mantém só em memória
    }
  }

  clear(): void {
    this.tokens = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // idem
    }
  }

  private ler(): Tokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  }
}
