import { PlusIcon, TaskIcon } from '../../components/icons';
import { TaskBoard } from './TaskBoard';
import { TaskEditorDialog } from './TaskEditorDialog';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { useAdminTasksPage } from './useAdminTasksPage';
import { useAuth } from '../../state/AuthContext';
import '../../assets/css/pages/admin-tasks.css';

export function AdminTasksPage() {
  const { user } = useAuth();
  const model = useAdminTasksPage(user);
  const { filter, setFilter, openCreate, notice, error } = model;
  return (
    <main className="admin-tasks-page">
      <header className="admin-tasks-heading">
        <div className="admin-tasks-title">
          <span aria-hidden="true"><TaskIcon width="24" height="24" /></span>
          <div><h1>Tarefas</h1><p>Organize as pendências da equipe</p></div>
        </div>
        <div className="admin-tasks-toolbar">
          <div className="admin-tasks-filter" aria-label="Filtrar tarefas">
            <button type="button" className={filter === 'all' ? 'is-active' : ''} disabled={model.saving} onClick={() => setFilter('all')}>Todas as tarefas</button>
            <button type="button" className={filter === 'mine' ? 'is-active' : ''} disabled={model.saving} onClick={() => setFilter('mine')}>Minhas tarefas</button>
          </div>
          <button type="button" className="btn btn-primary admin-tasks-create" onClick={openCreate} disabled={model.saving || model.loading}><PlusIcon width="17" height="17" />Nova Tarefa</button>
        </div>
      </header>

      {notice && <p className="admin-tasks-notice" role="status">{notice}</p>}
      {error && <div role="alert"><p className="admin-tasks-error">{error}</p><button className="btn btn-secondary" disabled={model.saving || model.loading} onClick={() => void model.load()}>Atualizar quadro</button></div>}

      <TaskBoard
        taskColumns={model.taskColumns}
        dropTarget={model.dropTarget}
        setDropTarget={model.setDropTarget}
        handleDrop={model.handleDrop}
        loading={model.loading}
        filter={model.filter}
        staff={model.staff}
        saving={model.saving}
        columnCounts={model.columnCounts}
        draggedId={model.draggedId}
        handleDragStart={model.handleDragStart}
        endDrag={model.endDrag}
        openEdit={model.openEdit}
      />

      {model.remoteMode && model.total > 30 && <nav aria-label="Paginação das tarefas">
        <button className="btn btn-secondary" disabled={model.page <= 1 || model.loading || model.saving} onClick={() => model.setPage(value => value - 1)}>Anterior</button>
        <span> Página {model.page} de {Math.max(1, Math.ceil(model.total / 30))} · {model.total} tarefas · até 30 por página </span>
        <button className="btn btn-secondary" disabled={model.page * 30 >= model.total || model.loading || model.saving} onClick={() => model.setPage(value => value + 1)}>Próxima</button>
      </nav>}
      <TaskEditorDialog
        editorRef={model.editorRef}
        editingTask={model.editingTask}
        form={model.form}
        setForm={model.setForm}
        formError={model.formError || model.error}
        staff={model.staff}
        dueDateLocked={model.dueDateLocked}
        saving={model.saving}
        submitTask={model.submitTask}
        closeEditor={model.closeEditor}
        onEditorClosed={model.onEditorClosed}
        requestDelete={model.requestDelete}
      />

      <TaskDeleteDialog
        deleteRef={model.deleteRef}
        deleteTarget={model.deleteTarget}
        setDeleteTarget={model.setDeleteTarget}
        saving={model.saving}
        error={model.error}
        confirmDelete={model.confirmDelete}
      />
    </main>
  );
}
