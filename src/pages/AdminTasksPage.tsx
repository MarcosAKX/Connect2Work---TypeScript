import { PlusIcon, TaskIcon } from '../components/icons';
import { TaskBoard } from '../components/admin-tasks/TaskBoard';
import { TaskEditorDialog } from '../components/admin-tasks/TaskEditorDialog';
import { TaskDeleteDialog } from '../components/admin-tasks/TaskDeleteDialog';
import { useAdminTasksPage } from '../hooks/useAdminTasksPage';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/admin-tasks.css';

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
            <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Todas as tarefas</button>
            <button type="button" className={filter === 'mine' ? 'is-active' : ''} onClick={() => setFilter('mine')}>Minhas tarefas</button>
          </div>
          <button type="button" className="btn btn-primary admin-tasks-create" onClick={openCreate}><PlusIcon width="17" height="17" />Nova Tarefa</button>
        </div>
      </header>

      {notice && <p className="admin-tasks-notice" role="status">{notice}</p>}
      {error && <p className="admin-tasks-error" role="alert">{error}</p>}

      <TaskBoard
        taskColumns={model.taskColumns}
        dropTarget={model.dropTarget}
        setDropTarget={model.setDropTarget}
        handleDrop={model.handleDrop}
        loading={model.loading}
        filter={model.filter}
        staff={model.staff}
        isAdmin={model.isAdmin}
        currentUserId={model.currentUserId}
        draggedId={model.draggedId}
        handleDragStart={model.handleDragStart}
        endDrag={model.endDrag}
        openEdit={model.openEdit}
      />

      <TaskEditorDialog
        editorRef={model.editorRef}
        editingTask={model.editingTask}
        form={model.form}
        setForm={model.setForm}
        formError={model.formError}
        staff={model.staff}
        isSecretaryEditing={model.isSecretaryEditing}
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
        confirmDelete={model.confirmDelete}
      />
    </main>
  );
}
