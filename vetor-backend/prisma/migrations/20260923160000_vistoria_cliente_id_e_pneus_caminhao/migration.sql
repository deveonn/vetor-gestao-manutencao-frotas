-- AlterTable
ALTER TABLE "vistorias" ADD COLUMN     "clienteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "vistorias_clienteId_key" ON "vistorias"("clienteId");

-- Dados: caminhão leve tem traseiro duplo (6 posições, como o enum TipoVeiculo documenta e o app mobile desenha),
-- mas os veículos existentes foram criados com 4. O traseiro que existia vira "interno" (mantém severidade e
-- observação) e o "externo" nasce OK — copiar a severidade duplicaria o alerta de um mesmo problema.
UPDATE "pneu_posicoes" SET "posicao" = "posicao" || ' interno'
WHERE "posicao" IN ('traseiro esquerdo', 'traseiro direito')
  AND "veiculoId" IN (SELECT "id" FROM "veiculos" WHERE "tipo" = 'CAMINHAO_LEVE');

INSERT INTO "pneu_posicoes" ("id", "veiculoId", "posicao", "severidade", "atualizadoEm")
SELECT 'mig' || md5(p."id" || p."posicao"), p."veiculoId", replace(p."posicao", ' interno', ' externo'), 'OK', now()
FROM "pneu_posicoes" p
JOIN "veiculos" v ON v."id" = p."veiculoId"
WHERE v."tipo" = 'CAMINHAO_LEVE' AND p."posicao" IN ('traseiro esquerdo interno', 'traseiro direito interno');
