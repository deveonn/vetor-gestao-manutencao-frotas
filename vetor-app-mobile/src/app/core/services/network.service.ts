import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly online = signal(true);

  constructor() {
    Network.getStatus().then((status) => this.online.set(status.connected));
    Network.addListener('networkStatusChange', (status) => {
      this.online.set(status.connected);
    });
  }
}
