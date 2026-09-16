import type { AdminUsersViewModel } from '../../hooks/useAdminUsersPage';

export function UserStats({ admin }: Pick<AdminUsersViewModel, 'admin'>) {
  return (
    <section className="admin-users-stats" aria-label="Resumo dos usuários">
      {[
        ['Total', admin.stats.total, 'neutral'],
        ['Ativos', admin.stats.active, 'success'],
        ['Inativos', admin.stats.inactive, 'danger'],
        ['Administradores', admin.stats.admin, 'admin'],
        ['Clientes', admin.stats.client, 'client'],
        ['Secretaria', admin.stats.secretaria, 'secretaria'],
      ].map(([label, value, tone]) => (
        <article key={label} className={`admin-users-stat tone-${tone}`}>
          <span>{label}</span><strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
