import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consultaAuditoria } from '../src/services/servico-auditoria';
test('auditoria recusa ator, detalhes, filtro longo e cursor inválido',()=>{
  assert.deepEqual(consultaAuditoria({}),{search:'',cursor:null});
  for(const input of [{actorUserId:'x'},{search:'x'.repeat(151)},{cursor:'bad'},{cursor:['x']},{details:true}])assert.throws(()=>consultaAuditoria(input),{status:400});
  const point={at:'2030-10-21 12:00:00.000123',id:'12345678-1234-4234-8234-123456789012'};
  assert.deepEqual(consultaAuditoria({cursor:Buffer.from(JSON.stringify(point)).toString('base64url')}).cursor,point);
});
