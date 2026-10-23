import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consultaMeusAgendamentos, cursorMeusAgendamentos } from '../src/services/validacao-meus-agendamentos';
test('consulta própria recusa proprietário, filtro inválido e cursor adulterado',()=>{
  assert.deepEqual(consultaMeusAgendamentos({status:'upcoming'}),{status:'upcoming',cursor:null});
  for(const query of [{userId:'outro'},{status:'todos'},{cursor:'x'},{cursor:'x'.repeat(300)}])assert.throws(()=>consultaMeusAgendamentos(query),{status:400});
  const point={at:'2030-10-21T11:00:00.000Z',id:'12345678-1234-4234-8234-123456789012'};
  assert.deepEqual(consultaMeusAgendamentos({status:'past',cursor:cursorMeusAgendamentos(point)}).cursor,point);
});
