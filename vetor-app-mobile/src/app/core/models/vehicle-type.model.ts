/**
 * Tipos de veículo suportados pelo app. Hoje o protótipo só usa "van", mas carro e
 * caminhão já têm configuração de pneus própria — novos tipos entram só adicionando
 * uma entrada em VEHICLE_TIRE_POSITIONS e VEHICLE_TYPE_META.
 */
export type VehicleType = 'carro' | 'van' | 'caminhao';

export interface TirePosition {
  label: string;
  /** caminho da imagem em /public/inspection que destaca a posição no diagrama do veículo */
  image: string;
}

export const VEHICLE_TIRE_POSITIONS: Record<VehicleType, TirePosition[]> = {
  carro: [
    { label: 'dianteiro esquerdo', image: 'inspection/car_1.png' },
    { label: 'dianteiro direito', image: 'inspection/car_2.png' },
    { label: 'traseiro esquerdo', image: 'inspection/car_3.png' },
    { label: 'traseiro direito', image: 'inspection/car_4.png' },
  ],
  van: [
    { label: 'dianteiro esquerdo', image: 'inspection/van_1.png' },
    { label: 'dianteiro direito', image: 'inspection/van_2.png' },
    { label: 'traseiro esquerdo', image: 'inspection/van_3.png' },
    { label: 'traseiro direito', image: 'inspection/van_4.png' },
  ],
  caminhao: [
    { label: 'dianteiro esquerdo', image: 'inspection/truck_1.png' },
    { label: 'dianteiro direito', image: 'inspection/truck_2.png' },
    { label: 'traseiro esquerdo interno', image: 'inspection/truck_3.png' },
    { label: 'traseiro esquerdo externo', image: 'inspection/truck_4.png' },
    { label: 'traseiro direito interno', image: 'inspection/truck_5.png' },
    { label: 'traseiro direito externo', image: 'inspection/truck_6.png' },
  ],
};

export interface VehicleTypeMeta {
  label: string;
  icon: string;
  /** concordância de gênero em português (carro/caminhão = m, van = f) */
  gender: 'm' | 'f';
  /** "este carro" / "esta van" — pra frases tipo "você está com ___?" */
  demonstrative: string;
  /** "do carro" / "da van" — pra frases tipo "foto ___", "vistoria ___" */
  articleDe: string;
  /** "o carro" / "a van" — pra frases tipo "só ___ de hoje está vinculado" */
  articleO: string;
}

export const VEHICLE_TYPE_META: Record<VehicleType, VehicleTypeMeta> = {
  carro: {
    label: 'carro',
    icon: 'directions_car',
    gender: 'm',
    demonstrative: 'este carro',
    articleDe: 'do carro',
    articleO: 'o carro',
  },
  van: {
    label: 'van',
    icon: 'airport_shuttle',
    gender: 'f',
    demonstrative: 'esta van',
    articleDe: 'da van',
    articleO: 'a van',
  },
  caminhao: {
    label: 'caminhão',
    icon: 'local_shipping',
    gender: 'm',
    demonstrative: 'este caminhão',
    articleDe: 'do caminhão',
    articleO: 'o caminhão',
  },
};

/** "vinculado"/"vinculada" — concorda o particípio com o gênero do tipo de veículo */
export function agree(meta: VehicleTypeMeta, masc: string, fem: string): string {
  return meta.gender === 'f' ? fem : masc;
}
