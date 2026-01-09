const hostname = window.location.hostname;

export const environment = {
  production: true,
  // Usar ruta relativa para que funcione tanto en localhost:3000 como en Cloudflare (https)
  // Al estar vacío, las peticiones irán a /auth, /ventas, etc. del mismo origen.
  apiUrl: '', 
  VAPID_PUBLIC_KEY: ''
};
