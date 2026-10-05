import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { QueueService } from '../../../core/services/queue.service';
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
    private queue: QueueService,
    private router: Router,
    private alertCtrl: AlertController,
  ) {}

  async confirmLogout(): Promise<void> {
    const pendentes = this.queue.pendingCount();
    if (pendentes > 0) {
      // sair com vistoria não enviada: bloqueado — ela só pode ser enviada com a conta de quem fez
      const bloqueio = await this.alertCtrl.create({
        header: 'ainda não dá para sair',
        message:
          pendentes === 1
            ? 'você tem 1 vistoria que ainda não foi enviada. conecte na internet e espere o envio (ou toque em "tentar de novo" no histórico) antes de sair.'
            : `você tem ${pendentes} vistorias que ainda não foram enviadas. conecte na internet e espere o envio (ou toque em "tentar de novo" no histórico) antes de sair.`,
        buttons: [
          { text: 'ver histórico', handler: () => void this.router.navigateByUrl('/tabs/historico') },
          { text: 'entendi', role: 'cancel' },
        ],
      });
      await bloqueio.present();
      return;
    }
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
