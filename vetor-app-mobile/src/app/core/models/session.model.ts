export interface Session {
  /** login do motorista na API (ex.: "joao.prates") */
  username: string;
  /** primeiro nome em minúsculas, como o app cumprimenta ("olá, joão") */
  displayName: string;
  /** nome completo do cadastro do motorista */
  nome: string;
  loginAt: string;
}
