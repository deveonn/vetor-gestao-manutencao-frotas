import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { SessionService } from '../../../core/services/session.service';
import { appVersion } from '../../../app.version';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  readonly appVersion = appVersion;

  constructor(
    readonly session: SessionService,
    private router: Router,
    private alertCtrl: AlertController,
  ) {}

  async confirmLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'sair da conta?',
      message: 'você vai precisar entrar de novo para continuar usando o app.',
      buttons: [
        { text: 'cancelar', role: 'cancel' },
        {
          text: 'sair',
          role: 'destructive',
          handler: async () => {
            await this.session.logout();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }
}
