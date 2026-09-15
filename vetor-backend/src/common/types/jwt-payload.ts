import { Papel } from '@prisma/client';

/** Claims do access token — empresaId escopa toda query multi-tenant; motoristaId só existe pro papel MOTORISTA. */
export interface JwtPayload {
  sub: string;
  papel: Papel;
  empresaId: string | null;
  motoristaId: string | null;
}
