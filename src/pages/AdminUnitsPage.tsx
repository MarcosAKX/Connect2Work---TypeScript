import { BackLink } from '../components/BackLink';
import { BuildingIcon, PlusIcon } from '../components/icons';
import { UnitFormDialog } from '../components/admin-units/UnitFormDialog';
import { DeleteUnitDialog } from '../components/admin-units/DeleteUnitDialog';
import { UnitTable } from '../components/admin-units/UnitTable';
import { useAdminUnitsPage } from '../hooks/useAdminUnitsPage';
import '../assets/css/pages/admin-units.css';

export function AdminUnitsPage() {
  const {
    units, isLoading, isSaving, error, mutationError, reload,
    isFormOpen, editingUnit, deletingUnit, statusMessage,
    openCreateForm, openEditForm, handleSave, handleDelete,
    closeForm, openDelete, closeDelete,
  } = useAdminUnitsPage();
  return (
    <main className="admin-units-page">
      <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />

      <header className="admin-units-page__intro">
        <div>
          <h1><BuildingIcon width="30" height="30" />Gerenciar Unidades</h1>
          <p>Cadastre, edite e gerencie as unidades do coworking</p>
        </div>
        <button type="button" className="btn btn-primary admin-units-page__new" onClick={openCreateForm}><PlusIcon width="18" height="18" />Nova Unidade</button>
      </header>

      {statusMessage && <p className="admin-units-page__status" role="status">{statusMessage}</p>}
      {error && (
        <div className="admin-units-page__load-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void reload()}>Tentar novamente</button>
        </div>
      )}

      <section className="admin-units-card" aria-labelledby="registered-units-title" aria-busy={isLoading}>
        <header><h2 id="registered-units-title">Unidades Cadastradas</h2><p>Total de {units.length} unidades</p></header>

        <UnitTable units={units} isLoading={isLoading} openCreateForm={openCreateForm} openEditForm={openEditForm} openDelete={openDelete} />
      </section>

      {isFormOpen && (
        <UnitFormDialog
          unit={editingUnit}
          isSaving={isSaving}
          gatewayError={mutationError}
          onCancel={closeForm}
          onSave={handleSave}
        />
      )}
      {deletingUnit && (
        <DeleteUnitDialog
          unit={deletingUnit}
          isSaving={isSaving}
          error={mutationError}
          onCancel={closeDelete}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}
