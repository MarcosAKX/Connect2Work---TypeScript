import { CloseIcon, TrashIcon } from '../icons';
import type { AdminTasksViewModel } from '../../hooks/useAdminTasksPage';

type TaskEditorProps = Pick<
  AdminTasksViewModel,
  | 'editorRef' | 'editingTask' | 'form' | 'setForm' | 'formError' | 'staff'
  | 'isSecretaryEditing' | 'saving' | 'submitTask' | 'closeEditor'
  | 'onEditorClosed' | 'requestDelete'
>;

export function TaskEditorDialog({
  editorRef, editingTask, form, setForm, formError, staff, isSecretaryEditing,
  saving, submitTask, closeEditor, onEditorClosed, requestDelete,
}: TaskEditorProps) {
  return (
    <dialog ref={editorRef} className="admin-task-modal" onClose={onEditorClosed}>
      <form method="dialog" onSubmit={(event) => { void submitTask(event); }}>
        <header>
          <div>
            <h2>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            <p>{editingTask ? 'Atualize as informações da pendência' : 'Adicione uma pendência ao quadro da equipe'}</p>
          </div>
          <button type="button" onClick={closeEditor} aria-label="Fechar">
            <CloseIcon width="20" height="20" />
          </button>
        </header>
        <label>
          <span className="admin-task-field-label">Título</span>
          <input
            value={form.title}
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            autoFocus
          />
        </label>
        <label>
          <span className="admin-task-field-label">Descrição <small>(opcional)</small></span>
          <textarea
            value={form.description}
            maxLength={500}
            rows={4}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
        <div className="admin-task-form-grid">
          <label>
            <span className="admin-task-field-label">Responsável</span>
            <select
              value={form.assignedTo}
              onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
            >
              <option value="">Sem responsável</option>
              {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label>
            <span className="admin-task-field-label">Prioridade</span>
            <select
              value={form.priority}
              onChange={(event) => setForm((current) => ({
                ...current,
                priority: event.target.value === 'low' || event.target.value === 'high'
                  ? event.target.value : 'medium',
              }))}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label>
            <span className="admin-task-field-label">
              Prazo <small>{isSecretaryEditing ? '(definido na criação)' : '(opcional)'}</small>
            </span>
            <input
              type="date"
              value={form.dueDate}
              disabled={isSecretaryEditing}
              title={isSecretaryEditing ? 'A data estimada não pode ser alterada após a criação' : undefined}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </label>
        </div>
        {formError && <p className="admin-task-form-error" role="alert">{formError}</p>}
        <footer className="admin-task-modal__actions">
          <div>
            {editingTask && (
              <button type="button" className="admin-task-delete" onClick={requestDelete}>
                <TrashIcon width="16" height="16" />Excluir
              </button>
            )}
          </div>
          <div>
            <button type="button" className="btn btn-secondary" onClick={closeEditor}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
