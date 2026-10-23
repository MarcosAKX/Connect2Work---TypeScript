import { BackLink } from '../../components/BackLink';
import { ActivityList } from './ActivityList';
import { HoursStatement } from './HoursStatement';
import { useAdminActivity } from './useAdminActivity';
import { useAuth } from '../../state/AuthContext';
import '../../assets/css/pages/admin-governance.css';

export function AdminActivityPage() {
  const { user } = useAuth();
  const model = useAdminActivity(user);
  const { clients, selectedClient, query, error, loading, filtered } = model;

  return (
    <main className="governance-page">
      <BackLink to="/admin" label="Voltar ao Dashboard" />
      <header className="governance-heading">
        <div>
          <span>Rastreabilidade</span>
          <h1>Atividades e extratos</h1>
          <p>Acompanhe alterações administrativas e o consumo dos planos de horas.</p>
        </div>
      </header>
      {error && <div className="governance-notice is-error" role="alert">{error} <button type="button" className="governance-secondary" onClick={model.retry} disabled={loading}>Tentar novamente</button></div>}
      <section className="governance-card governance-card--wide">
        <div className="governance-toolbar">
          <div>
            <h2>Atividades recentes</h2>
            <p>{loading ? 'Carregando registros…' : `${model.total} registros encontrados`}</p>
          </div>
          <label>
            <span>Buscar atividades</span>
            <input type="search" maxLength={150} placeholder="Pessoa, item ou ID" value={query} onChange={(event) => model.search(event.target.value)} />
          </label>
        </div>
        <ActivityList loading={loading} filtered={filtered} limit={model.limit} query={query} clearSearch={model.clearSearch} />
        {model.hasMore && (
          <button className="governance-secondary" type="button" onClick={() => void model.loadMore()} disabled={model.loadingMore}>{model.loadingMore ? 'Carregando…' : 'Carregar mais'}</button>
        )}
      </section>
      <section className="governance-card governance-card--wide">
        <div className="governance-toolbar">
          <div><h2>Extrato do plano de horas</h2><p>Créditos, consumos, estornos e ajustes.</p></div>
          <label>
            <span>Cliente</span>
            <select value={selectedClient} disabled={model.http} onChange={(event) => model.setSelectedClient(event.target.value)}>
              <option value="">Selecione o cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
        </div>
        {model.http ? <p className="governance-empty">Extrato disponível após a integração dos planos de horas.</p> : <HoursStatement userId={selectedClient} actorId={user?.id ?? ''} />}
      </section>
    </main>
  );
}
