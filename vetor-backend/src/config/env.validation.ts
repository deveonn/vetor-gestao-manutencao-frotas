/**
 * Valida o ambiente na subida (ConfigModule.forRoot({ validate })): faltando algo obrigatório, a API nem sobe —
 * melhor que subir e, por exemplo, assinar JWT com segredo indefinido.
 */
export function validarAmbiente(env: Record<string, unknown>): Record<string, unknown> {
  const erros: string[] = [];
  const texto = (k: string) => (typeof env[k] === 'string' ? (env[k] as string).trim() : '');
  const producao = texto('NODE_ENV') === 'production';

  if (!texto('DATABASE_URL')) erros.push('DATABASE_URL é obrigatória.');

  const segredo = texto('JWT_SECRET');
  if (!segredo) erros.push('JWT_SECRET é obrigatório.');
  else if (producao && (segredo.length < 32 || segredo.startsWith('troque-'))) {
    erros.push('JWT_SECRET de produção precisa ter 32+ caracteres e não pode ser o valor do .env.example.');
  }

  if (producao && !texto('CORS_ORIGIN')) erros.push('CORS_ORIGIN é obrigatória em produção.');

  const driver = texto('STORAGE_DRIVER') || 'local';
  if (driver !== 'local' && driver !== 's3') erros.push('STORAGE_DRIVER deve ser "local" ou "s3".');
  if (driver === 's3') {
    for (const k of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL']) {
      if (!texto(k)) erros.push(`${k} é obrigatória com STORAGE_DRIVER=s3.`);
    }
  }
  // disco local num container de produção perde as fotos a cada deploy — só com volume persistente montado
  if (producao && driver === 'local' && texto('UPLOADS_PERSISTENTE') !== 'true') {
    erros.push('Em produção use STORAGE_DRIVER=s3, ou UPLOADS_PERSISTENTE=true se UPLOADS_DIR for um volume persistente.');
  }

  if (erros.length) throw new Error(`Ambiente inválido:\n- ${erros.join('\n- ')}`);
  return env;
}
