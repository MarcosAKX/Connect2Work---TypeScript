import { createAppServices } from './create-app-services';
// Produção usa API e falha fechada; mock é restrito ao desenvolvimento/testes.
export const services = createAppServices(import.meta.env.PROD || import.meta.env.VITE_AUTH_API === 'true');