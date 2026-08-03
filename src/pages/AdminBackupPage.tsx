import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BackLink } from '../components/BackLink';
import { useAuth } from '../state/AuthContext';
import { services } from '../services';
import type { BackupPayload } from '../types/domain';
import '../assets/css/pages/admin-governance.css';

const MAX_BACKUP_SIZE = 20 * 1024 * 1024;

export function AdminBackupPage() {
  const { user, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void services.backup.getLastBackupAt(user.id).then(setLastBackupAt);
  }, [user]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function exportBackup() {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const backup = await services.backup.exportData(user.id);
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `connect2work-backup-${backup.exportedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
      setLastBackupAt(backup.exportedAt);
      setNotice('Backup criado e baixado.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Falha ao criar backup.'); }
    finally { setBusy(false); }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPayload(null); setConfirmation(''); setError(''); setNotice('');
    if (!file) return;
    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) return setError('Selecione um arquivo JSON.');
    if (file.size > MAX_BACKUP_SIZE) return setError('O backup deve ter no máximo 20 MB.');
    try { setPayload(JSON.parse(await file.text()) as BackupPayload); }
    catch { setError('Arquivo JSON inválido.'); }
  }

  async function restoreBackup() {
    if (!user || !payload || confirmation !== 'RESTAURAR') return;
    setBusy(true); setError('');
    try {
      await services.backup.importData(payload, user.id);
      await logout();
      window.location.assign('/login');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Falha ao restaurar backup.'); setBusy(false); }
  }

  return <main className="governance-page">
    <BackLink to="/admin" label="Voltar ao Dashboard" />
    <header className="governance-heading"><div><span>Segurança local</span><h1>Backup dos dados</h1><p>Exporte uma cópia ou restaure o estado completo deste navegador.</p></div></header>
    {(notice || error) && <div className={`governance-notice ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</div>}
    <section className="governance-grid">
      <article className="governance-card"><span className="governance-card__eyebrow">Cópia segura</span><h2>Exportar backup</h2><p>Inclui dados operacionais, unidades, salas, reservas, tarefas e históricos. Senhas, tokens e sessões nunca são exportados.</p><strong>{lastBackupAt ? `Último: ${new Date(lastBackupAt).toLocaleString('pt-BR')}` : 'Nenhum backup registrado'}</strong><button type="button" className="governance-primary" onClick={() => void exportBackup()} disabled={busy}>Baixar backup JSON</button></article>
      <article className="governance-card governance-card--danger"><span className="governance-card__eyebrow">Ação crítica</span><h2>Restaurar backup</h2><p>Substitui os dados locais e preserva credenciais existentes. Contas novas importadas ficam inativas por segurança. A sessão será encerrada.</p><input ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => void chooseFile(event)} />
        {payload && <><small>Backup de {new Date(payload.exportedAt).toLocaleString('pt-BR')} · versão {payload.schemaVersion}</small><label>Digite <strong>RESTAURAR</strong> para confirmar<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label><button type="button" className="governance-danger" disabled={busy || confirmation !== 'RESTAURAR'} onClick={() => void restoreBackup()}>Restaurar e sair</button></>}
      </article>
    </section>
  </main>;
}
