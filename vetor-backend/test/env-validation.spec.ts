import { validarAmbiente } from '../src/config/env.validation';

const prodOk = {
  NODE_ENV: 'production', DATABASE_URL: 'postgresql://x', JWT_SECRET: 'a'.repeat(40), CORS_ORIGIN: 'https://painel',
  STORAGE_DRIVER: 's3', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's', S3_PUBLIC_URL: 'https://pub',
};

describe('validarAmbiente', () => {
  it('dev só precisa de banco e segredo', () => {
    expect(() => validarAmbiente({ DATABASE_URL: 'x', JWT_SECRET: 'y' })).not.toThrow();
  });
  it('sem banco ou sem segredo não sobe', () => {
    expect(() => validarAmbiente({ JWT_SECRET: 'y' })).toThrow(/DATABASE_URL/);
    expect(() => validarAmbiente({ DATABASE_URL: 'x' })).toThrow(/JWT_SECRET/);
  });
  it('produção completa com S3 passa', () => {
    expect(() => validarAmbiente(prodOk)).not.toThrow();
  });
  it('produção recusa segredo curto ou o do .env.example', () => {
    expect(() => validarAmbiente({ ...prodOk, JWT_SECRET: 'curto' })).toThrow(/32\+ caracteres/);
    expect(() => validarAmbiente({ ...prodOk, JWT_SECRET: 'troque-este-segredo-de-access-token-xxxxxxxxxx' })).toThrow(/32\+ caracteres/);
  });
  it('produção exige CORS e storage persistente', () => {
    expect(() => validarAmbiente({ ...prodOk, CORS_ORIGIN: '' })).toThrow(/CORS_ORIGIN/);
    expect(() => validarAmbiente({ ...prodOk, STORAGE_DRIVER: 'local' })).toThrow(/UPLOADS_PERSISTENTE/);
    expect(() => validarAmbiente({ ...prodOk, STORAGE_DRIVER: 'local', UPLOADS_PERSISTENTE: 'true' })).not.toThrow();
  });
  it('S3 incompleto lista o que falta', () => {
    expect(() => validarAmbiente({ ...prodOk, S3_PUBLIC_URL: '', S3_BUCKET: '' })).toThrow(/S3_BUCKET[\s\S]*S3_PUBLIC_URL/);
  });
});
