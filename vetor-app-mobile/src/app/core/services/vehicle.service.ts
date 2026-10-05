import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Vehicle } from '../models/vehicle.model';
import { VehicleType } from '../models/vehicle-type.model';
import { SessionService } from './session.service';

const VEHICLE_KEY = 'vetor.veiculo-do-dia';

/** Veículo como vem de GET /motorista/veiculo-do-dia. */
interface VeiculoApi {
  id: string;
  placa: string;
  modelo: string;
  tipo: 'UTILITARIO' | 'VAN_CARGA' | 'CAMINHAO_LEVE';
  hodometro: number;
}

/** Mesma correspondência documentada no enum TipoVeiculo (vetor-backend/prisma/schema.prisma). */
export const TIPO_API: Record<VeiculoApi['tipo'], VehicleType> = {
  UTILITARIO: 'carro',
  VAN_CARGA: 'van',
  CAMINHAO_LEVE: 'caminhao',
};

function paraVeiculo(v: VeiculoApi): Vehicle {
  return {
    id: v.id,
    plate: v.placa,
    // o app escreve tudo em minúsculas ("mercedes sprinter 415")
    model: v.modelo.toLowerCase(),
    color: null,
    odometerKm: v.hodometro,
    photoDataUrl: null,
    type: TIPO_API[v.tipo],
  };
}

/**
 * Veículo vinculado ao motorista hoje. Offline-first: fica em cache no Preferences, então dá pra começar
 * uma vistoria sem internet; com rede, a API confirma (404 = sem veículo vinculado, limpa o cache).
 */
@Injectable({ providedIn: 'root' })
export class VehicleService {
  private http = inject(HttpClient);
  private session = inject(SessionService);

  readonly todaysVehicle = signal<Vehicle | null>(null);
  readonly loading = signal(false);

  constructor() {
    // acompanha a sessão: entrou (ou reabriu logado) -> cache + API; saiu -> esquece o veículo do motorista anterior.
    // Enquanto a sessão ainda está sendo restaurada do Preferences ela é null, e isso NÃO é logout — sem essa
    // espera, abrir o app apagava o cache e reabrir sem internet ficava sem veículo.
    effect(() => {
      if (this.session.restoring()) return;
      if (this.session.session()) {
        void this.carregar();
      } else {
        this.todaysVehicle.set(null);
        void Preferences.remove({ key: VEHICLE_KEY });
      }
    });
  }

  /** Mostra o cache na hora e atualiza pela API. */
  async carregar(): Promise<void> {
    const { value } = await Preferences.get({ key: VEHICLE_KEY });
    if (value && !this.todaysVehicle()) {
      this.todaysVehicle.set(JSON.parse(value) as Vehicle);
    }
    await this.atualizar();
  }

  async atualizar(): Promise<void> {
    this.loading.set(true);
    try {
      const veiculo = paraVeiculo(
        await firstValueFrom(this.http.get<VeiculoApi>(`${environment.apiUrl}/motorista/veiculo-do-dia`)),
      );
      this.todaysVehicle.set(veiculo);
      await Preferences.set({ key: VEHICLE_KEY, value: JSON.stringify(veiculo) });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.todaysVehicle.set(null);
        await Preferences.remove({ key: VEHICLE_KEY });
      }
      // sem rede (ou outro erro): segue com o que estava em cache
    } finally {
      this.loading.set(false);
    }
  }
}
