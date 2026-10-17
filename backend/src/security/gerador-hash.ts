export interface GeradorHash { gerar(senha: string): Promise<string>; }
