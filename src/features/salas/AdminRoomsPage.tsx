import { BackLink } from '../../components/BackLink';
import { DoorIcon, PlusIcon } from '../../components/icons';
import { RoomFormDialog } from './RoomFormDialog';
import { DeleteRoomDialog } from './DeleteRoomDialog';
import { RoomTable } from './RoomTable';
import { useAdminRooms } from './useAdminRooms';
import '../../assets/css/pages/admin-rooms.css';

export function AdminRoomsPage() {
  const model = useAdminRooms();
  const { data, formOpen, editingRoom, deletingRoom, status } = model;

  return (
    <main className="admin-rooms-page">
      <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />
      <header className="admin-rooms-page__intro">
        <div>
          <h1><DoorIcon width="32" height="32" />Gerenciar Salas</h1>
          <p>Cadastre, edite e gerencie as salas do coworking</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={model.openCreate} disabled={data.units.length === 0}>
          <PlusIcon width="18" height="18" />Nova Sala
        </button>
      </header>
      {status && <p className="admin-rooms-page__status" role="status">{status}</p>}
      {data.error && (
        <div className="admin-rooms-page__load-error" role="alert">
          <span>{data.error}</span>
          <button type="button" onClick={() => void data.reload()}>Tentar novamente</button>
        </div>
      )}
      <section className="admin-rooms-card" aria-labelledby="registered-rooms-title" aria-busy={data.isLoading}>
        <header>
          <div><h2 id="registered-rooms-title">Salas Cadastradas</h2><p>Total de {data.total || data.filteredRooms.length} salas</p></div>
          {data.canSearchUnits && <div className="field"><input aria-label="Buscar unidade para filtrar salas" value={data.unitSearch} onChange={event => data.setUnitSearch(event.target.value)} placeholder="Buscar unidade pelo nome" /></div>}
          <label>
            <span className="sr-only">Filtrar por unidade</span>
            <select value={data.selectedUnitId} onChange={(event) => data.setSelectedUnitId(event.target.value)}>
              <option value="">Todas as unidades</option>
              {data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>
        </header>
        <RoomTable data={data} openEdit={model.openEdit} openDelete={model.openDelete} />
        {data.total > 20 && <nav aria-label="Paginação de salas"><button className="btn btn-secondary" disabled={data.isLoading || data.isSaving || data.page <= 1} onClick={() => data.setPage(data.page - 1)}>Anterior</button><span> Página {data.page} de {Math.ceil(data.total / 20)} </span><button className="btn btn-secondary" disabled={data.isLoading || data.isSaving || data.page * 20 >= data.total} onClick={() => data.setPage(data.page + 1)}>Próxima</button></nav>}
      </section>
      {formOpen && (
        <RoomFormDialog
          {...(data.canSearchUnits ? { unitSearch: data.unitSearch, onUnitSearch: data.setUnitSearch } : {})}
          room={editingRoom}
          units={data.units}
          isSaving={data.isSaving}
          gatewayError={data.mutationError}
          onCancel={model.closeForm}
          onSave={model.save}
        />
      )}
      {deletingRoom && (
        <DeleteRoomDialog
          room={deletingRoom}
          isSaving={data.isSaving}
          error={data.mutationError}
          onCancel={model.closeDelete}
          onConfirm={model.remove}
        />
      )}
    </main>
  );
}
