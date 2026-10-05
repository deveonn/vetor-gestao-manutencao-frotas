import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistoryEntry } from '../models/queue.model';
import { QueueService } from './queue.service';
import { SessionService } from './session.service';
import { TIPO_API } from './vehicle.service';

const HISTORY_KEY = 'vetor.historico';

/** Vistoria como vem de GET /vistorias/minhas (só o que o histórico usa). */
interface VistoriaApi {
  id: string;
  clienteId: string | null;
  iniciadoEm: string;
  concluidoEm: string | null;
  temAlertaCritico: boolean;
  temAlertaAtencao: boolean;
  veiculo: { placa: string; tipo: keyof typeof TIPO_API };
}

type VistoriaServidor = HistoryEntry & { clienteId: string | null };

/** Cache do Preferences — com o dono, pra nunca mostrar o histórico de outro motorista. */
interface Cache {
  owner: string;
  itens: VistoriaServidor[];
}

function paraEntrada(v: VistoriaApi): VistoriaServidor {
  return {
    id: v.id,
    clienteId: v.clienteId,
    vehiclePlate: v.veiculo.placa,
    vehicleType: TIPO_API[v.veiculo.tipo],
    createdAt: v.concluidoEm ?? v.iniciadoEm,
    hasCriticalAlert: v.temAlertaCritico,
    hasWarnAlert: v.temAlertaAtencao,
    status: 'sent',
  };
}

/**
 * Histórico do motorista = vistorias registradas no servidor (GET /vistorias/minhas, sobrevive a reinstalar o app)
 * + a fila local (o que ainda não chegou lá). Offline-first: o que veio do servidor fica em cache no Preferences.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private http = inject(HttpClient);
  private session = inject(SessionService);
  private queue = inject(QueueService);

  private readonly servidor = signal<VistoriaServidor[]>([]);

  /** fila local primeiro (é a versão mais recente do item) + o que só o servidor tem, mais novas primeiro */
  readonly items = computed<HistoryEntry[]>(() => {
    const locais = this.queue.items();
    const idsLocais = new Set(locais.map((i) => i.id));
    const enviadas = new Set(locais.map((i) => i.serverId).filter((id): id is string => !!id));
    const soNoServidor = this.servidor().filter(
      (v) => !enviadas.has(v.id) && !(v.clienteId && idsLocais.has(v.clienteId)),
    );
    return [...locais, ...soNoServidor].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  constructor() {
    // mesma regra do VehicleService: sessão null durante a restauração não é logout
    effect(() => {
      if (this.session.restoring()) return;
      if (this.session.session()) {
        void this.carregar();
      } else {
        this.servidor.set([]);
        void Preferences.remove({ key: HISTORY_KEY });
      }
    });
  }

  /** Mostra o cache na hora e atualiza pela API. */
  private async carregar(): Promise<void> {
    const login = this.session.session()?.username;
    const { value } = await Preferences.get({ key: HISTORY_KEY });
    const cache = value ? (JSON.parse(value) as Cache) : null;
    if (cache && login && cache.owner === login) this.servidor.set(cache.itens);
    await this.atualizar();
  }

  async atualizar(): Promise<void> {
    const login = this.session.session()?.username;
    if (!login) return;
    try {
      const lista = await firstValueFrom(
        this.http.get<VistoriaApi[]>(`${environment.apiUrl}/vistorias/minhas`),
      );
      if (this.session.session()?.username !== login) return; // trocou de motorista no meio
      const itens = lista.map(paraEntrada);
      this.servidor.set(itens);
      await Preferences.set({ key: HISTORY_KEY, value: JSON.stringify({ owner: login, itens } satisfies Cache) });
      // o servidor já tem essas: a fila local não precisa mais guardar
      await this.queue.removerEnviadas(new Set(itens.map((i) => i.id)));
    } catch {
      // sem rede (ou erro do servidor): segue com o cache
    }
  }
}
