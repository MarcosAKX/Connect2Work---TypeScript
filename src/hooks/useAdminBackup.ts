import { useEffect, useState, type ChangeEvent } from 'react';
import { services } from '../services';
import type { BackupPayload, User } from '../types/domain';

const MAX_BACKUP_SIZE = 20 * 1024 * 1024;

export function useAdminBackup(user: User | null, logout: () => Promise<void>) {
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

  return { lastBackupAt, payload, confirmation, notice, error, busy, setConfirmation, exportBackup, chooseFile, restoreBackup };
}

export type AdminBackupViewModel = ReturnType<typeof useAdminBackup>;
