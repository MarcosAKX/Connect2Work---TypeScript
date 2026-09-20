import type { AdminBackupViewModel } from '../../hooks/useAdminBackup';

type Props = Pick<AdminBackupViewModel, 'lastBackupAt' | 'busy' | 'exportBackup'>;

export function BackupExport({ lastBackupAt, busy, exportBackup }: Props) {
  return (
    <article className="governance-card">
      <span className="governance-card__eyebrow">Cópia segura</span>
      <h2>Exportar backup</h2>
      <p>Inclui dados operacionais, unidades, salas, reservas, tarefas e históricos. Senhas, tokens e sessões nunca são exportados.</p>
      <strong>{lastBackupAt ? `Último: ${new Date(lastBackupAt).toLocaleString('pt-BR')}` : 'Nenhum backup registrado'}</strong>
      <button type="button" className="governance-primary" onClick={() => void exportBackup()} disabled={busy}>Baixar backup JSON</button>
    </article>
  );
}
