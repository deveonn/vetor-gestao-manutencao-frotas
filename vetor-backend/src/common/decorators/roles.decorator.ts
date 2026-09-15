import { SetMetadata } from '@nestjs/common';
import { Papel } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe uma rota aos papéis informados — checado pelo RolesGuard global. */
export const Roles = (...roles: Papel[]) => SetMetadata(ROLES_KEY, roles);
