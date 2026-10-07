/**
 * Renova os dados demo: avança as datas da empresa do seed em dias inteiros, pra o cenário ficar como se o seed
 * tivesse rodado hoje (resumo da semana, gráficos, alertas de anomalia dos últimos 30 dias, prazos de manutenção e
 * validade de CNH andam juntos, então nada muda de "vencido" pra "em dia" ou vice-versa).
 *
 * Âncora: a atividade mais recente da empresa (abastecimento, manutenção concluída ou vistoria). No seed ela está
 * a ANCORA_DIAS dias atrás; o script desloca tudo pra ela voltar a esse ponto. Nunca volta datas pra trás — se
 * alguém registrou algo há menos de ANCORA_DIAS dias, não faz nada. Rodar de novo no mesmo dia também não faz nada.
 *
 * `npm run demo:renovar` (usa o DATABASE_URL do .env ou do ambiente). Em produção roda todo dia pelo GitHub Actions
 * (.github/workflows/renovar-demo.yml).
 */
import { Prisma, PrismaClient } from '@prisma/client';

// mesmo cnpj e mesmo "abastecimento mais recente: há 6 dias" do prisma/seed.ts
const CNPJ_DEMO = '12.456.789/0001-30';
const ANCORA_DIAS = 6;
const DIA_MS = 24 * 60 * 60 * 1000;

const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { cnpj: CNPJ_DEMO } });
  if (!empresa) {
    console.log(`Empresa demo (${CNPJ_DEMO}) não encontrada — nada a renovar.`);
    return;
  }
  const empresaId = empresa.id;

  const [abastecimento, manutencao, vistoria] = await Promise.all([
    prisma.abastecimento.aggregate({ where: { empresaId }, _max: { data: true } }),
    prisma.manutencao.aggregate({ where: { empresaId }, _max: { concluidoEm: true } }),
    prisma.vistoria.aggregate({ where: { empresaId }, _max: { iniciadoEm: true } }),
  ]);
  const datas = [abastecimento._max.data, manutencao._max.concluidoEm, vistoria._max.iniciadoEm].filter(
    (d): d is Date => d != null,
  );
  if (!datas.length) {
    console.log('Empresa demo sem atividade registrada — nada a renovar.');
    return;
  }
  const ancora = new Date(Math.max(...datas.map((d) => d.getTime())));
  const alvo = Date.now() - ANCORA_DIAS * DIA_MS;
  const dias = Math.round((alvo - ancora.getTime()) / DIA_MS);
  if (dias <= 0) {
    console.log(`Atividade mais recente em ${ancora.toISOString()} — dados demo já estão em dia.`);
    return;
  }

  const desloca = (coluna: string) => Prisma.sql`${Prisma.raw(`"${coluna}"`)} + make_interval(days => ${dias}::int)`;
  const linhas = await prisma.$transaction([
    prisma.$executeRaw`UPDATE "abastecimentos" SET "data" = ${desloca('data')} WHERE "empresaId" = ${empresaId}`,
    prisma.$executeRaw`
      UPDATE "manutencoes"
      SET "concluidoEm" = ${desloca('concluidoEm')}, "criadoEm" = ${desloca('criadoEm')},
          "dataLimite" = "dataLimite" + ${dias}::int
      WHERE "empresaId" = ${empresaId}`,
    prisma.$executeRaw`
      UPDATE "vistorias" SET "iniciadoEm" = ${desloca('iniciadoEm')}, "concluidoEm" = ${desloca('concluidoEm')}
      WHERE "empresaId" = ${empresaId}`,
    prisma.$executeRaw`UPDATE "motoristas" SET "validadeCnh" = ${desloca('validadeCnh')} WHERE "empresaId" = ${empresaId}`,
    prisma.$executeRaw`
      UPDATE "vinculos_motorista_veiculo" SET "de" = ${desloca('de')}, "ate" = ${desloca('ate')}
      WHERE "veiculoId" IN (SELECT "id" FROM "veiculos" WHERE "empresaId" = ${empresaId})`,
  ]);

  console.log(
    `Dados demo avançados ${dias} dia(s): ${linhas[0]} abastecimentos, ${linhas[1]} manutenções, ${linhas[2]} vistorias, ` +
      `${linhas[3]} motoristas, ${linhas[4]} vínculos.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
