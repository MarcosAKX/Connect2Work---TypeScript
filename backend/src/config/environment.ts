export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
}
export interface EnvironmentConfig {
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly db: DatabaseConfig;
}
function required(input: Record<string, string | undefined>, key: string): string {
  const value = input[key];
  if (value === undefined || value.trim() === '') throw new Error(`Configuração inválida: ${key}.`);
  return value;
}
function port(input: string, key: string): number {
  if (!/^\d+$/.test(input)) throw new Error(`Configuração inválida: ${key}.`);
  const value = Number(input);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`Configuração inválida: ${key}.`);
  return value;
}
export function validateEnvironment(input: Record<string, string | undefined>): EnvironmentConfig {
  const host = required(input, 'DB_HOST');
  const user = required(input, 'DB_USER');
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error('Configuração inválida: DB_HOST.');
  if (user !== 'c2w_api') throw new Error('Configuração inválida: DB_USER.');
  const database = required(input, 'DB_NAME');
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Configuração inválida: DB_NAME.');
  return {
    host: '127.0.0.1', port: port(input.PORT ?? '3001', 'PORT'),
    db: { host, port: port(input.DB_PORT ?? '3306', 'DB_PORT'), database, user, password: required(input, 'DB_PASSWORD') }
  };
}