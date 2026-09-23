import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, OfflineBannerComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage implements OnInit {
  readonly username = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private session: SessionService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    while (this.session.restoring()) {
      await new Promise((r) => setTimeout(r, 30));
    }
    if (this.session.hasCachedSession()) {
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
    }
  }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);

    if (!this.username().trim() || !this.password().trim()) {
      this.error.set('preencha usuário e senha para entrar.');
      return;
    }

    this.loading.set(true);
    await new Promise((r) => setTimeout(r, 500));
    const ok = await this.session.login(this.username(), this.password());
    this.loading.set(false);

    if (ok) {
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
    } else {
      this.error.set('usuário ou senha inválidos.');
    }
  }
}
