import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const TOKENS_KEY = 'vetor.tokens';

/**
 * Par access/refresh da API, persistido em Preferences (sobrevive a fechar o app e a ficar offline).
 * A leitura do Preferences é assíncrona: quem precisa do token no boot espera `ready`.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private tokens: Tokens | null = null;
  readonly ready: Promise<void> = this.load();

  get accessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.tokens?.refreshToken ?? null;
  }

  async set(tokens: Tokens): Promise<void> {
    this.tokens = tokens;
    await Preferences.set({ key: TOKENS_KEY, value: JSON.stringify(tokens) });
  }

  async clear(): Promise<void> {
    this.tokens = null;
    await Preferences.remove({ key: TOKENS_KEY });
  }

  private async load(): Promise<void> {
    const { value } = await Preferences.get({ key: TOKENS_KEY });
    this.tokens = value ? (JSON.parse(value) as Tokens) : null;
  }
}
