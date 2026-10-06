-- AlterTable
ALTER TABLE "manutencoes" ADD COLUMN     "dataLimite" DATE,
ADD COLUMN     "kmAlvo" INTEGER;

-- Dados: as pendentes que já existem (seed/mock) tinham km restante, urgência e prazo congelados. Vira meta:
-- kmAlvo = hodômetro atual + km restante; "ou N dias" no prazo vira dataLimite = criação + N dias. Daqui em diante
-- km restante, urgência e prazo são calculados na leitura.
UPDATE "manutencoes" m
SET "kmAlvo" = v."hodometro" + m."kmRestante"
FROM "veiculos" v
WHERE m."veiculoId" = v."id" AND m."status" = 'PENDENTE' AND m."kmRestante" IS NOT NULL AND m."kmAlvo" IS NULL;

UPDATE "manutencoes"
SET "dataLimite" = ("criadoEm" + (substring("prazo" from 'ou ([0-9]+) dias'))::int * interval '1 day')::date
WHERE "status" = 'PENDENTE' AND "dataLimite" IS NULL AND "prazo" ~ 'ou [0-9]+ dias';
