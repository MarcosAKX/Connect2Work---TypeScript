import type { AuthConfig } from '../config/auth-environment';
interface RequestProtegido { method: string; url: string; headers: Record<string, string | string[] | undefined>; }
interface ResponseProtegido { status(code: number): ResponseProtegido; json(body: { message: string }): void; }
export function protecaoHttp(config: AuthConfig) {
  return (request: RequestProtegido, response: ResponseProtegido, next: () => void): void => {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') { next(); return; }
    const origin = request.headers.origin;
    const contentType = request.headers['content-type'];
    if (typeof origin !== 'string' || !config.origins.includes(origin) || request.headers['x-c2w-request'] !== '1' ||
        typeof contentType !== 'string' || contentType.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      response.status(403).json({ message: 'Requisição não permitida.' }); return;
    }
    next();
  };
}
