import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuditoriaController,AUDITORIA } from '../src/controllers/auditoria.controller';
import { COOKIE_ADMIN } from '../src/controllers/usuarios-administrativos.controller';
import { CookieSessao } from '../src/security/cookie-sessao';
import { TokenSessao } from '../src/security/token-sessao';
import { AcessoAdministrativo } from '../src/security/acesso-administrativo';
import { ServicoAuditoria } from '../src/services/servico-auditoria';
import type { Papel } from '../src/dto/usuario-gerenciado.dto';
@Module({}) class TestModule{}
test('HTTP auditoria: admin somente, valida query, somente leitura e falhas sanitizadas',async()=>{
  const token=new TokenSessao().gerar().token;let logged=true,active=true,broken=false,role:Papel='admin',calls=0;
  const access=new AcessoAdministrativo({async consultar(){return logged?{user:{id:'admin',name:'Admin',email:'admin@example.invalid',role,active,profession:'',phone:'',createdAt:'2026-10-21T12:00:00Z',hasHoursPlan:false,hoursBalance:0},idleExpiresAt:'',absoluteExpiresAt:''}:null;}});
  const service=new ServicoAuditoria({async listar(q){calls++;assert.equal(q.search,'Nome');if(broken)throw new Error('SQL-PRIVATE');return {items:[],total:0,nextCursor:null};}},access);
  const app=await NestFactory.create({module:TestModule,controllers:[AuditoriaController],providers:[{provide:AUDITORIA,useValue:service},{provide:COOKIE_ADMIN,useValue:new CookieSessao(false)}]},{logger:false});
  try{
    await app.listen(0,'127.0.0.1');const url=(await app.getUrl())+'/admin/atividades';const headers={Cookie:'c2w_session='+token};
    assert.equal((await fetch(url)).status,401);
    for(const value of ['client','secretaria'] as const){role=value;assert.equal((await fetch(url,{headers})).status,403);}assert.equal(calls,0);
    role='admin';assert.equal((await fetch(url+'?actorUserId=outro',{headers})).status,400);assert.equal(calls,0);
    assert.equal((await fetch(url+'?search=Nome',{headers})).status,200);
    assert.equal((await fetch(url,{headers,method:'DELETE'})).status,404);
    active=false;assert.equal((await fetch(url,{headers})).status,401);active=true;logged=false;assert.equal((await fetch(url,{headers})).status,401);
    logged=true;broken=true;const failure=await fetch(url+'?search=Nome',{headers});assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('SQL-PRIVATE'));
  }finally{await app.close();}
});
