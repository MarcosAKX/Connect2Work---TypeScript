import { BackLink } from '../components/BackLink';
import { BackupExport } from '../components/admin-backup/BackupExport';
import { BackupRestore } from '../components/admin-backup/BackupRestore';
import { useAdminBackup } from '../hooks/useAdminBackup';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-governance.css';

export function AdminBackupPage() {
  const { user, logout } = useAuth();
  const model = useAdminBackup(user, logout);
  return (
    <main className="governance-page">
      <BackLink to="/admin" label="Voltar ao Dashboard" />
      <header className="governance-heading">
        <div>
          <span>Segurança local</span>
          <h1>Backup dos dados</h1>
          <p>Exporte uma cópia ou restaure o estado completo deste navegador.</p>
        </div>
      </header>
      {(model.notice || model.error) && (
        <div className={`governance-notice ${model.error ? 'is-error' : ''}`} role={model.error ? 'alert' : 'status'}>
          {model.error || model.notice}
        </div>
      )}
      <section className="governance-grid">
        <BackupExport lastBackupAt={model.lastBackupAt} busy={model.busy} exportBackup={model.exportBackup} />
        <BackupRestore
          payload={model.payload}
          confirmation={model.confirmation}
          busy={model.busy}
          setConfirmation={model.setConfirmation}
          chooseFile={model.chooseFile}
          restoreBackup={model.restoreBackup}
        />
      </section>
    </main>
  );
}
