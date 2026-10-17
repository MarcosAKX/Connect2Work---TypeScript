interface Conexao { destroy(): void; release(): void; }
// O prazo cobre espera no pool, SQL, BEGIN/COMMIT e eventual ROLLBACK.
// Uma conexão com operação falha não retorna ao pool com comandos pendentes.
export async function comConexaoLimitada<T, C extends Conexao>(
  obter: () => Promise<C>, executar: (connection: C) => Promise<T>, prazoMs = 5000
): Promise<T> {
  let connection: C | undefined;
  let concluida = false;
  let descartada = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function descartar(): void {
    descartada = true;
    try { connection?.destroy(); } catch { /* Já encerrada: não devolvê-la ao pool. */ }
  }
  const prazo = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      concluida = true;
      descartar();
      reject(new Error('Prazo da operação de banco excedido.'));
    }, prazoMs);
  });
  const trabalho = (async () => {
    const borrowed = await obter();
    if (concluida) { borrowed.release(); throw new Error('Prazo da aquisição excedido.'); }
    connection = borrowed;
    return executar(borrowed);
  })();
  try { return await Promise.race([trabalho, prazo]); }
  catch (error: unknown) { if (!descartada) descartar(); throw error; }
  finally {
    concluida = true;
    if (timer) clearTimeout(timer);
    if (!descartada) connection?.release();
  }
}
