import { BadRequestException } from '@nestjs/common';
import type { RepositorioAgendamentosAdministrativos } from '../repositories/contracts/repositorio-agendamentos-administrativos';
import type { AcessoAdministrativo } from '../security/acesso-administrativo';
import { LimiteAdministrativo } from '../security/limite-administrativo';
import { consultaAgendamentos, criacaoAgendamento, acaoAgendamento } from './validacao-agendamentos-administrativos';
import { uuid } from './validacao-usuario-administrativo';
export class ServicoAgendamentosAdministrativos {
 private readonly limite=new LimiteAdministrativo();
 constructor(private readonly repo: RepositorioAgendamentosAdministrativos,private readonly acesso: Pick<AcessoAdministrativo,'exigir'>){}
 private async ator(token: string|null,escrita: boolean){const actor=await this.acesso.exigir(token,['admin','secretaria']);this.limite.verificar(actor.id,escrita);return actor;}
 async listar(token: string|null,query: unknown){const actor=await this.ator(token,false);return this.repo.listar(actor,consultaAgendamentos(query));}
 async painel(token: string|null,query: unknown){const actor=await this.ator(token,false);return this.repo.painel(actor,consultaAgendamentos(query));}
 async criar(token: string|null,input: unknown){const actor=await this.ator(token,true);return this.repo.criar(actor,criacaoAgendamento(input));}
 async alterar(token: string|null,id: string,name: string,input: unknown){
  const actor=await this.ator(token,true);uuid(id);
  const action=(['confirmacao','pagamento','cancelamento','chegada'] as const).find(value=>value===name);if(!action)throw new BadRequestException('Ação inválida.');
  const data=acaoAgendamento(action,input);return this.repo.alterar(actor,id,action,data.expectedVersion,data.reason);
 }
}
