import { Injectable, signal } from '@angular/core';
import { ToastService } from './toast.service';

export interface LoginResult {
  emailErr: string;
  passErr: string;
  credErr: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly loggedIn = signal(false);
  readonly authenticating = signal(false);

  constructor(private toast: ToastService) {}

  /** Replica a regra do protótipo: qualquer e-mail válido + senha "demo" entra. */
  login(email: string, pass: string): Promise<LoginResult> {
    const emailErr = !email ? 'Informe o e-mail da conta' : !email.includes('@') ? 'E-mail inválido — confira o formato' : '';
    const passErr = !pass ? 'Informe a senha' : '';
    if (emailErr || passErr) {
      return Promise.resolve({ emailErr, passErr, credErr: false });
    }
    if (pass !== 'demo') {
      return Promise.resolve({ emailErr: '', passErr: '', credErr: true });
    }
    this.authenticating.set(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        this.authenticating.set(false);
        this.loggedIn.set(true);
        this.toast.show('Frota sincronizada às 09:12 — bem-vindo de volta', 'info');
        resolve({ emailErr: '', passErr: '', credErr: false });
      }, 1100);
    });
  }

  logout(): void {
    this.loggedIn.set(false);
  }
}
