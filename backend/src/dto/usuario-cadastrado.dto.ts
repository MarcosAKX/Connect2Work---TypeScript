// Resposta publica do cadastro: nunca inclui senha, hash ou token.
export interface UsuarioCadastradoDto {
  id: string;
  name: string;
  email: string;
  profession: string;
  phone: string;
  role: 'client';
  active: boolean;
  createdAt: string;
  hasHoursPlan: boolean;
  hoursBalance: number;
}