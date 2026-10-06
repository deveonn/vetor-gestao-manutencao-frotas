// API de produção (Render) — ver "Produção" em vetor-backend/README-backend.md. Em dev vale environment.ts (localhost).
// HTTPS, então funciona no Android sem liberar nada além do network_security_config de dev (só localhost).
export const environment = {
  production: true,
  apiUrl: 'https://vetor-api-wviu.onrender.com/api',
};
