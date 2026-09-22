-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ROOT', 'ADMIN', 'MOTORISTA');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('UTILITARIO', 'VAN_CARGA', 'CAMINHAO_LEVE');

-- CreateEnum
CREATE TYPE "StatusVeiculo" AS ENUM ('RODANDO', 'MANUTENCAO', 'PARADO');

-- CreateEnum
CREATE TYPE "Severidade" AS ENUM ('OK', 'ATENCAO', 'CRITICO');

-- CreateEnum
CREATE TYPE "StatusManutencao" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "StatusIntegracaoRastreamento" AS ENUM ('CONECTADO', 'SEM');

-- CreateEnum
CREATE TYPE "AvaliacaoVistoria" AS ENUM ('OK', 'ATENCAO', 'TROCAR');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "contatoNome" TEXT NOT NULL,
    "contatoEmail" TEXT NOT NULL,
    "contatoFone" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "email" TEXT,
    "usuario" TEXT,
    "senhaHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT,
    "motoristaId" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL,
    "status" "StatusVeiculo" NOT NULL DEFAULT 'PARADO',
    "hodometro" INTEGER NOT NULL DEFAULT 0,
    "nivelCombustivel" INTEGER NOT NULL DEFAULT 0,
    "kmL" DOUBLE PRECISION,
    "kmParaTroca" INTEGER NOT NULL DEFAULT 10000,
    "kmHoje" INTEGER NOT NULL DEFAULT 0,
    "arquivadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motoristaAtualId" TEXT,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pneu_posicoes" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "posicao" TEXT NOT NULL,
    "severidade" "Severidade" NOT NULL DEFAULT 'OK',
    "observacao" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pneu_posicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoriaCnh" TEXT NOT NULL,
    "validadeCnh" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculos_motorista_veiculo" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "de" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ate" TIMESTAMP(3),

    CONSTRAINT "vinculos_motorista_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "litros" DOUBLE PRECISION NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "hodometro" INTEGER NOT NULL,
    "kmL" DOUBLE PRECISION,
    "anomalo" BOOLEAN NOT NULL DEFAULT false,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" "StatusManutencao" NOT NULL DEFAULT 'PENDENTE',
    "kmRestante" INTEGER,
    "nivel" "Severidade",
    "prazo" TEXT,
    "custo" DOUBLE PRECISION,
    "oficina" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_manutencao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoVeiculo" "TipoVeiculo" NOT NULL,

    CONSTRAINT "planos_manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_manutencao_itens" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "km" TEXT NOT NULL,
    "tempo" TEXT NOT NULL,

    CONSTRAINT "plano_manutencao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistorias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),
    "temAlertaCritico" BOOLEAN NOT NULL DEFAULT false,
    "temAlertaAtencao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "vistorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoria_itens" (
    "id" TEXT NOT NULL,
    "vistoriaId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "avaliacao" "AvaliacaoVistoria" NOT NULL,
    "observacao" TEXT,
    "midiaId" TEXT,

    CONSTRAINT "vistoria_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "midias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes_rastreamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "status" "StatusIntegracaoRastreamento" NOT NULL DEFAULT 'SEM',
    "tokenHash" TEXT,
    "tokenCauda" TEXT,
    "conectadoEm" TIMESTAMP(3),

    CONSTRAINT "integracoes_rastreamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_motoristaId_key" ON "usuarios"("motoristaId");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE INDEX "veiculos_empresaId_idx" ON "veiculos"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_empresaId_placa_key" ON "veiculos"("empresaId", "placa");

-- CreateIndex
CREATE UNIQUE INDEX "pneu_posicoes_veiculoId_posicao_key" ON "pneu_posicoes"("veiculoId", "posicao");

-- CreateIndex
CREATE INDEX "motoristas_empresaId_idx" ON "motoristas"("empresaId");

-- CreateIndex
CREATE INDEX "vinculos_motorista_veiculo_veiculoId_idx" ON "vinculos_motorista_veiculo"("veiculoId");

-- CreateIndex
CREATE INDEX "vinculos_motorista_veiculo_motoristaId_idx" ON "vinculos_motorista_veiculo"("motoristaId");

-- CreateIndex
CREATE INDEX "fornecedores_empresaId_idx" ON "fornecedores"("empresaId");

-- CreateIndex
CREATE INDEX "abastecimentos_empresaId_idx" ON "abastecimentos"("empresaId");

-- CreateIndex
CREATE INDEX "abastecimentos_veiculoId_data_idx" ON "abastecimentos"("veiculoId", "data");

-- CreateIndex
CREATE INDEX "manutencoes_empresaId_idx" ON "manutencoes"("empresaId");

-- CreateIndex
CREATE INDEX "manutencoes_veiculoId_idx" ON "manutencoes"("veiculoId");

-- CreateIndex
CREATE UNIQUE INDEX "planos_manutencao_empresaId_tipoVeiculo_key" ON "planos_manutencao"("empresaId", "tipoVeiculo");

-- CreateIndex
CREATE INDEX "plano_manutencao_itens_planoId_idx" ON "plano_manutencao_itens"("planoId");

-- CreateIndex
CREATE INDEX "vistorias_empresaId_idx" ON "vistorias"("empresaId");

-- CreateIndex
CREATE INDEX "vistorias_veiculoId_idx" ON "vistorias"("veiculoId");

-- CreateIndex
CREATE INDEX "vistorias_motoristaId_idx" ON "vistorias"("motoristaId");

-- CreateIndex
CREATE INDEX "vistoria_itens_vistoriaId_idx" ON "vistoria_itens"("vistoriaId");

-- CreateIndex
CREATE INDEX "midias_empresaId_idx" ON "midias"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "integracoes_rastreamento_empresaId_key" ON "integracoes_rastreamento"("empresaId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_motoristaAtualId_fkey" FOREIGN KEY ("motoristaAtualId") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneu_posicoes" ADD CONSTRAINT "pneu_posicoes_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_motorista_veiculo" ADD CONSTRAINT "vinculos_motorista_veiculo_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_motorista_veiculo" ADD CONSTRAINT "vinculos_motorista_veiculo_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_manutencao" ADD CONSTRAINT "planos_manutencao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_manutencao_itens" ADD CONSTRAINT "plano_manutencao_itens_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoria_itens" ADD CONSTRAINT "vistoria_itens_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoria_itens" ADD CONSTRAINT "vistoria_itens_midiaId_fkey" FOREIGN KEY ("midiaId") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes_rastreamento" ADD CONSTRAINT "integracoes_rastreamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
