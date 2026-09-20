import { BackLink } from '../components/BackLink';
import { BuildingIcon } from '../components/icons';
import { ServiceDialog } from '../components/admin-business-services/ServiceDialog';
import { ServiceCard } from '../components/admin-business-services/ServiceCard';
import { useAdminBusinessServicesPage } from '../hooks/useAdminBusinessServicesPage';
import '../assets/css/pages/admin-business-services.css';

export function AdminBusinessServicesPage() {
  const { data, editing, status, save, openEditor, closeEditor } = useAdminBusinessServicesPage();
  return (
    <main className="admin-services-page">
      <BackLink to="/admin" label="Voltar ao Dashboard" />
      <header className="admin-services-page__intro">
        <div>
          <h1><BuildingIcon width="31" height="31" />Gerenciar Serviços</h1>
          <p>Edite conteúdo e imagens da vitrine de serviços empresariais.</p>
        </div>
      </header>
      {status && <p className="admin-services-page__status" role="status">{status}</p>}
      {data.error && !editing && <p className="admin-services-page__error" role="alert">{data.error}</p>}
      <section className="admin-services-grid" aria-busy={data.isLoading}>
        {data.isLoading ? <p>Carregando serviços…</p> : data.items.map((item) => (
          <ServiceCard key={item.id} item={item} onEdit={openEditor} />
        ))}
      </section>
      {editing && (
        <ServiceDialog
          item={editing}
          saving={data.isSaving}
          error={data.error}
          onClose={closeEditor}
          onSave={save}
        />
      )}
    </main>
  );
}
