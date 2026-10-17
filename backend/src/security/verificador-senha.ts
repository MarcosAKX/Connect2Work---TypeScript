export interface VerificadorSenha { verificar(hash: string, senha: string): Promise<boolean>; }
