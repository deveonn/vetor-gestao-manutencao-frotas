import { Component, input } from '@angular/core';
import { NetworkService } from '../../../core/services/network.service';

@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  /** texto customizado; se omitido usa a mensagem padrão */
  readonly message = input<string>(
    'sem internet agora — pode trabalhar normal. tudo é enviado depois.',
  );

  constructor(readonly network: NetworkService) {}
}
