import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Session } from '../models/session.model';

const SESSION_KEY = 'vetor.session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly session = signal<Session | null>(null);
  readonly restoring = signal(true);

  constructor() {
    this.restore();
  }

  private async restore(): Promise<void> {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (value) {
      this.session.set(JSON.parse(value) as Session);
    }
    this.restoring.set(false);
  }

  /** Mock auth: aceita qualquer usuário/senha não vazios; sessão fica em cache para login offline. */
  async login(username: string, password: string): Promise<boolean> {
    if (!username.trim() || !password.trim()) {
      return false;
    }
    const session: Session = {
      username: username.trim(),
      displayName: username.trim().split('.')[0],
      loginAt: new Date().toISOString(),
    };
    this.session.set(session);
    await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
    return true;
  }

  hasCachedSession(): boolean {
    return this.session() !== null;
  }

  async logout(): Promise<void> {
    this.session.set(null);
    await Preferences.remove({ key: SESSION_KEY });
  }
}
