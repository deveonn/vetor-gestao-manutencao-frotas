import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { appVersion } from '../../app.version';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrl: './splash.page.scss',
})
export class SplashPage implements OnInit {
  readonly appVersion = appVersion;

  constructor(
    private router: Router,
    private session: SessionService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.finish(), 1300);
  }

  private async finish(): Promise<void> {
    while (this.session.restoring()) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (this.session.hasCachedSession()) {
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
    } else {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
