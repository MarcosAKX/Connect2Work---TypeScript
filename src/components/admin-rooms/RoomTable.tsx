import { DoorIcon, UsersIcon, ImageIcon, PencilIcon, TrashIcon } from '../icons';
import type { AdminRoomsViewModel } from '../../hooks/useAdminRoomsPage';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function RoomTable({
  data, openEdit, openDelete,
}: Pick<AdminRoomsViewModel, 'data' | 'openEdit' | 'openDelete'>) {
  if (data.isLoading) {
    return (
      <div className="admin-rooms-loading" aria-label="Carregando salas"><span /><span /><span /></div>
    );
  }
  if (data.filteredRooms.length === 0) {
    return (
      <div className="admin-rooms-empty">
        <DoorIcon width="30" height="30" />
        <h3>Nenhuma sala encontrada</h3>
        <p>{data.selectedUnitId ? 'Nenhuma sala cadastrada nesta unidade.' : 'Cadastre a primeira sala para começar.'}</p>
      </div>
    );
  }
  return (
    <div className="admin-rooms-table-wrap">
      <table className="admin-rooms-table">
        <thead>
          <tr><th>Sala</th><th>Unidade</th><th>Capacidade</th><th>Preço/Hora</th><th>Imagens</th><th>Comodidades</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {data.filteredRooms.map(({ room, unitName, imageCount }) => (
            <tr key={room.id}>
              <td data-label="Sala"><strong>{room.name}</strong></td>
              <td data-label="Unidade">{unitName}</td>
              <td data-label="Capacidade">
                <span className="admin-rooms-table__metric"><UsersIcon width="17" height="17" />{room.capacity}</span>
              </td>
              <td data-label="Preço/Hora">
                <strong className="admin-rooms-table__price">{money.format(room.pricePerHour)}</strong>
              </td>
              <td data-label="Imagens">
                <span className="admin-rooms-table__metric"><ImageIcon width="17" height="17" />{imageCount}</span>
              </td>
              <td data-label="Comodidades">
                <div className="admin-rooms-table__amenities">
                  {room.amenities.slice(0, 2).map((item) => <span key={item}>{item}</span>)}
                  {room.amenities.length > 2 && <span>+{room.amenities.length - 2}</span>}
                </div>
              </td>
              <td data-label="Ações">
                <div className="admin-rooms-table__actions">
                  <button type="button" onClick={() => openEdit(room)} aria-label={`Editar ${room.name}`}>
                    <PencilIcon width="18" height="18" />
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => openDelete(room)}
                    aria-label={`Excluir ${room.name}`}
                  >
                    <TrashIcon width="18" height="18" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
