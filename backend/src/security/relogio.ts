export interface Relogio { agora(): Date; }
export class RelogioSistema implements Relogio { agora(): Date { return new Date(); } }
