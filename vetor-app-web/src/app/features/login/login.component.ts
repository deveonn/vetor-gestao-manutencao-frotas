import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'vetor-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  pass = '';
  emailErr = signal('');
  passErr = signal('');
  credErr = signal(false);
  apiErr = signal('');
  auth$ = this.auth.authenticating;

  onEmailChange(): void {
    this.emailErr.set('');
    this.credErr.set(false);
    this.apiErr.set('');
  }

  onPassChange(): void {
    this.passErr.set('');
    this.credErr.set(false);
    this.apiErr.set('');
  }

  async entrar(): Promise<void> {
    const res = await this.auth.login(this.email, this.pass);
    this.emailErr.set(res.emailErr);
    this.passErr.set(res.passErr);
    this.credErr.set(res.credErr);
    this.apiErr.set(res.apiErr);
    if (this.auth.loggedIn()) {
      this.router.navigate(['/painel']);
    }
  }
}
