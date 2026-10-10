import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseService, buildPoolOptions, type DatabaseConnection } from '../src/infrastructure/database/database.service';
import { validateEnvironment } from '../src/config/environment';
const config = validateEnvironment({ DB_HOST: '127.0.0.1', DB_NAME: 'connect2work', DB_USER: 'c2w_api', DB_PASSWORD: 'fake-test-password' });
test('pool preserves decimals and limits waiting connections', () => {
  const options = buildPoolOptions(config.db);
  assert.equal(options.decimalNumbers, false);
  assert.equal(options.multipleStatements, false);
  assert.equal(options.timezone, 'Z');
  assert.equal(options.connectionLimit, 5);
  assert.equal(options.queueLimit, 10);
});
test('readiness sets server session UTC and always releases connection', async () => {
  const statements: string[] = [];
  let released = false;
  let ended = false;
  const connection: DatabaseConnection = {
    async execute(sql) { statements.push(sql); }, release() { released = true; }
  };
  const service = new DatabaseService({ async getConnection() { return connection; }, async end() { ended = true; } });
  assert.equal(await service.isReady(), true);
  assert.deepEqual(statements, ["SET time_zone = '+00:00'", 'SELECT 1']);
  assert.equal(released, true);
  await service.onModuleDestroy();
  assert.equal(ended, true);
});
test('connection failures return false and release borrowed connections', async () => {
  let released = false;
  const service = new DatabaseService({
    async getConnection() { return { async execute() { throw new Error('private secret'); }, release() { released = true; } }; },
    async end() {}
  });
  assert.equal(await service.isReady(), false);
  assert.equal(released, true);
  const unavailable = new DatabaseService({ async getConnection() { throw new Error('private host'); }, async end() {} });
  assert.equal(await unavailable.isReady(), false);
});