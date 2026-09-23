import { QueueStatus } from '../models/queue.model';

export function queueStatusIcon(status: QueueStatus): string {
  switch (status) {
    case 'sent':
      return 'check_circle';
    case 'sending':
      return 'sync';
    case 'error':
      return 'cancel';
    default:
      return 'schedule';
  }
}

export function queueStatusIsFilled(status: QueueStatus): boolean {
  return status === 'sent' || status === 'error';
}

export function queueStatusLabel(status: QueueStatus, hasCriticalAlert: boolean, hasWarnAlert: boolean): string {
  switch (status) {
    case 'sent':
      return hasCriticalAlert
        ? 'enviada — teve 1 alerta de manutenção corretiva'
        : hasWarnAlert
          ? 'enviada — teve atenção'
          : 'enviada — tudo certo';
    case 'sending':
      return 'enviando agora…' + (hasCriticalAlert ? ' · 1 alerta de manutenção corretiva' : '');
    case 'error':
      return 'falhou ao enviar — toque para tentar de novo';
    default:
      return 'guardada no celular, vai ser enviada';
  }
}
