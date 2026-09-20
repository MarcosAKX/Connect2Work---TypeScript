import { useRef } from 'react';
import type { AdminBackupViewModel } from '../../hooks/useAdminBackup';

type Props = Pick<AdminBackupViewModel, 'payload' | 'confirmation' | 'busy' | 'setConfirmation' | 'chooseFile' | 'restoreBackup'>;

export function BackupRestore({ payload, confirmation, busy, setConfirmation, chooseFile, restoreBackup }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <article className="governance-card governance-card--danger">
      <span className="governance-card__eyebrow">Ação crítica</span>
      <h2>Restaurar backup</h2>
      <p>Substitui os dados locais e preserva credenciais existentes. Contas novas importadas ficam inativas por segurança. A sessão será encerrada.</p>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => void chooseFile(event)} />
      {payload && <>
        <small>Backup de {new Date(payload.exportedAt).toLocaleString('pt-BR')} · versão {payload.schemaVersion}</small>
        <label>Digite <strong>RESTAURAR</strong> para confirmar<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
        <button type="button" className="governance-danger" disabled={busy || confirmation !== 'RESTAURAR'} onClick={() => void restoreBackup()}>Restaurar e sair</button>
      </>}
    </article>
  );
}
