import { PencilIcon, PlusIcon } from '../icons';
import type { AdminHoursPlanViewModel } from '../../hooks/useAdminHoursPlanPage';
import { isHoursPlanExpired } from '../../utils/booking';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
type HoursPlanTableProps = Pick<AdminHoursPlanViewModel, 'plan' | 'setEditing' | 'setRenewing'>;

export function HoursPlanTable({ plan, setEditing, setRenewing }: HoursPlanTableProps) {
  if (plan.loading) return <div className="hours-plan-loading"><span /><span /><span /></div>;

  return (
    <div className="hours-plan-table-wrap">
      <table className="hours-plan-table">
        <thead>
          <tr>
            <th>Nome</th><th>E-mail</th><th>Status do plano</th><th>Saldo</th>
            <th>Total do pacote</th><th>Renovação</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {plan.users.map((user) => {
            const expired = isHoursPlanExpired(user);
            return (
              <tr key={user.id}>
                <td data-label="Nome"><strong>{user.name}</strong></td>
                <td data-label="E-mail">{user.email}</td>
                <td data-label="Status">
                  <span className={`hours-plan-badge ${!user.hasHoursPlan ? 'is-none' : expired ? 'is-expired' : 'is-current'}`}>
                    {!user.hasHoursPlan ? 'Sem plano' : expired ? 'Vencido' : 'Em dia'}
                  </span>
                </td>
                <td data-label="Saldo">{user.hasHoursPlan ? `${user.hoursBalance} horas` : '—'}</td>
                <td data-label="Total">{user.hasHoursPlan ? `${user.hoursPlanTotal ?? 0} horas` : '—'}</td>
                <td data-label="Renovação">
                  {user.hasHoursPlan && user.hoursPlanRenewsOn ? (
                    <time dateTime={user.hoursPlanRenewsOn}>
                      {dateFormatter.format(new Date(`${user.hoursPlanRenewsOn}T12:00:00`))}
                    </time>
                  ) : '—'}
                </td>
                <td data-label="Ações">
                  <div className="hours-plan-actions">
                    <button type="button" onClick={() => setEditing(user)} disabled={plan.savingId === user.id}>
                      {user.hasHoursPlan ? (
                        <><PencilIcon width="14" height="14" />Ajustar</>
                      ) : (
                        <><PlusIcon width="14" height="14" />Ativar plano</>
                      )}
                    </button>
                    {expired && (
                      <button
                        type="button"
                        className="is-renew"
                        onClick={() => setRenewing(user)}
                        disabled={plan.savingId === user.id}
                      >
                        Confirmar renovação
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
