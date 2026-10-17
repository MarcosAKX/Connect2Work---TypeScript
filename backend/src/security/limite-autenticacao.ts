import { HttpException, HttpStatus } from '@nestjs/common';
interface Janela { inicio: number; tentativas: number; }
export class LimiteAutenticacao {
  private global: Janela = { inicio: 0, tentativas: 0 };
  private readonly enderecos = new Map<string, Janela>();
  consumir(endereco: string, agora = Date.now()): void {
    for (const [key, value] of this.enderecos) if (agora - value.inicio >= 60000) this.enderecos.delete(key);
    if (agora - this.global.inicio >= 60000) this.global = { inicio: agora, tentativas: 0 };
    let janela = this.enderecos.get(endereco);
    if (!janela) {
      if (this.enderecos.size >= 1000) this.negar();
      janela = { inicio: agora, tentativas: 0 };
      this.enderecos.set(endereco, janela);
    }
    this.global.tentativas++; janela.tentativas++;
    if (this.global.tentativas > 30 || janela.tentativas > 10) this.negar();
  }
  private negar(): never { throw new HttpException('Muitas tentativas. Aguarde um minuto.', HttpStatus.TOO_MANY_REQUESTS); }
}
