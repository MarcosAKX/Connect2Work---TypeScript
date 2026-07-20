import { createLocalStorageServices } from './local-storage';

// Único ponto de troca futura: Firebase ou Supabase implementarão os mesmos contratos.
export const services = createLocalStorageServices();
