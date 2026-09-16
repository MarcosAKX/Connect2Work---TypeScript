import { BackLink } from '../components/BackLink';
import { DoorIcon, PlusIcon } from '../components/icons';
import { RoomFormDialog } from '../components/admin-rooms/RoomFormDialog';
import { DeleteRoomDialog } from '../components/admin-rooms/DeleteRoomDialog';
import { RoomTable } from '../components/admin-rooms/RoomTable';
import { useAdminRoomsPage } from '../hooks/useAdminRoomsPage';
import '../assets/css/pages/admin-rooms.css';

export function AdminRoomsPage() {
  const model = useAdminRoomsPage();
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
          <div><h2 id="registered-rooms-title">Salas Cadastradas</h2><p>Total de {data.rooms.length} salas</p></div>
          <label>
            <span className="sr-only">Filtrar por unidade</span>
            <select value={data.selectedUnitId} onChange={(event) => data.setSelectedUnitId(event.target.value)}>
              <option value="">Todas as unidades</option>
              {data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>
        </header>
        <RoomTable data={data} openEdit={model.openEdit} openDelete={model.openDelete} />
      </section>
      {formOpen && (
        <RoomFormDialog
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
