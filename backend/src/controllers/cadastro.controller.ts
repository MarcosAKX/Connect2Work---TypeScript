import { Body, Controller, Inject, Post, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { ServicoCadastro } from '../services/servico-cadastro';
export const CADASTRO = Symbol('CADASTRO');
@Controller('auth')
export class CadastroController {
  private janelaInicio = Date.now();
  private tentativas = 0;
  constructor(@Inject(CADASTRO) private readonly cadastro: ServicoCadastro) {}
  @Post('register')
  async register(@Body() body: unknown) {
    try {
      const now = Date.now();
      if (now - this.janelaInicio >= 60000) { this.janelaInicio = now; this.tentativas = 0; }
      if (++this.tentativas > 12) throw new HttpException('Muitas tentativas. Aguarde um minuto.', HttpStatus.TOO_MANY_REQUESTS);
      return await this.cadastro.cadastrar(body);
    }
    catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Nao foi possivel criar sua conta. Tente novamente.');
    }
  }
}