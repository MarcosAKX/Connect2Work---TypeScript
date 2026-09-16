import { BuildingIcon, DoorIcon, PencilIcon, PlusIcon, TrashIcon } from '../icons';
import type { AdminUnitsViewModel } from '../../hooks/useAdminUnitsPage';

type UnitTableProps = Pick<AdminUnitsViewModel, 'units' | 'isLoading' | 'openCreateForm' | 'openEditForm' | 'openDelete'>;

export function UnitTable({ units, isLoading, openCreateForm, openEditForm, openDelete }: UnitTableProps) {
  return (
    <>
        {isLoading ? (
          <div className="admin-units-loading" aria-label="Carregando unidades"><span /><span /><span /></div>
        ) : units.length === 0 ? (
          <div className="admin-units-empty"><BuildingIcon width="28" height="28" /><h3>Nenhuma unidade cadastrada</h3><p>Cadastre a primeira unidade para começar a gerenciar seus espaços.</p><button type="button" className="btn btn-primary" onClick={openCreateForm}><PlusIcon width="18" height="18" />Nova Unidade</button></div>
        ) : (
          <div className="admin-units-table-wrap">
            <table className="admin-units-table">
              <thead><tr><th scope="col">Nome</th><th scope="col">Endereço</th><th scope="col">Salas</th><th scope="col">Ações</th></tr></thead>
              <tbody>
                {units.map(({ unit, roomCount }) => (
                  <tr key={unit.id}>
                    <td data-label="Nome"><strong>{unit.name}</strong></td>
                    <td data-label="Endereço">{unit.address}</td>
                    <td data-label="Salas"><span className="admin-units-table__rooms"><DoorIcon width="17" height="17" />{roomCount}</span></td>
                    <td data-label="Ações">
                      <div className="admin-units-table__actions">
                        <button type="button" onClick={() => openEditForm(unit)} aria-label={`Editar ${unit.name}`}><PencilIcon width="18" height="18" /></button>
                        <button type="button" className="is-danger" onClick={() => openDelete(unit)} aria-label={`Excluir ${unit.name}`}><TrashIcon width="18" height="18" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}
