export interface UsuarioPublicoDto {
  id: string; name: string; email: string; profession: string; phone: string;
  role: 'client' | 'admin' | 'secretaria'; active: boolean; createdAt: string;
  hasHoursPlan: boolean; hoursBalance: number;
}
