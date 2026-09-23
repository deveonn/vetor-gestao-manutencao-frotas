import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SyncService } from './core/services/sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IonApp],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor(private sync: SyncService) {
    void this.sync;
    this.setupStatusBar();
  }

  private async setupStatusBar(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0d1320' });
    } catch {
      // plataforma sem suporte a status bar customizada — ignora
    }
  }
}
