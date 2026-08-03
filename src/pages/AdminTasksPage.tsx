import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { CheckCircleIcon, ClockIcon, CloseIcon, LockIcon, PlusIcon, TaskIcon, TrashIcon, UserIcon } from '../components/icons';
import { useAdminTasks } from '../hooks/useAdminTasks';
import { useAuth } from '../state/AuthContext';
import type { Task, TaskPriority, TaskStatus } from '../types/domain';
import { formatTaskDueDate, getTaskDueState } from '../utils/tasks';
import '../assets/css/pages/admin-tasks.css';

const columns: Array<{ status: TaskStatus; label: string; icon: typeof TaskIcon }> = [
  { status: 'todo', label: 'A Fazer', icon: TaskIcon },
  { status: 'in_progress', label: 'Em Andamento', icon: ClockIcon },
  { status: 'done', label: 'Concluído', icon: CheckCircleIcon },
];

const priorityLabels: Record<TaskPriority, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

type TaskFormState = {
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string;
};

const emptyForm: TaskFormState = { title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' };

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function AdminTasksPage() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const isAdmin = user?.role === 'admin';
  const { columns: taskColumns, staff, filter, setFilter, loading, saving, error, notice, createTask, updateTask, moveTask, deleteTask } = useAdminTasks(currentUserId);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const editorRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const isSecretaryEditing = Boolean(editingTask && user?.role === 'secretaria');

  useEffect(() => {
    if (deleteTarget) deleteRef.current?.showModal();
    else deleteRef.current?.close();
  }, [deleteTarget]);

  function openCreate() {
    setEditingTask(null);
    setForm(emptyForm);
    setFormError('');
    editorRef.current?.showModal();
  }

  function openEdit(task: Task) {
    if (!isAdmin && task.createdBy !== currentUserId) return;
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? '',
      assignedTo: task.assignedTo ?? '',
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    });
    setFormError('');
    editorRef.current?.showModal();
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError('Informe o título da tarefa.');
      return;
    }
    const input = {
      title: form.title,
      description: form.description || undefined,
      assignedTo: form.assignedTo || undefined,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
    };
    const succeeded = editingTask
      ? await updateTask(editingTask.id, input)
      : await createTask(input);
    if (succeeded) editorRef.current?.close();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (await deleteTask(deleteTarget.id)) setDeleteTarget(null);
  }

  function handleDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    setDraggedId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  }

  async function handleDrop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);
    setDropTarget(null);
    if (taskId) await moveTask(taskId, status);
  }

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

      <section className="admin-task-board" aria-label="Quadro de tarefas">
        {columns.map(({ status, label, icon: Icon }) => {
          const items = taskColumns[status];
          return (
            <section
              key={status}
              className={`admin-task-column${dropTarget === status ? ' is-drop-target' : ''}`}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(status); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null); }}
              onDrop={(event) => { void handleDrop(event, status); }}
            >
              <header><span><Icon width="17" height="17" />{label}</span><strong>{items.length}</strong></header>
              <div className="admin-task-column__list">
                {loading && <><i className="admin-task-skeleton" /><i className="admin-task-skeleton" /></>}
                {!loading && items.length === 0 && <p className="admin-task-empty">{filter === 'mine' ? 'Nenhuma tarefa sua nesta etapa' : 'Nenhuma tarefa nesta etapa'}</p>}
                {items.map((task) => {
                  const assignee = staff.find((person) => person.id === task.assignedTo);
                  const creator = staff.find((person) => person.id === task.createdBy);
                  const canEditContent = isAdmin || task.createdBy === currentUserId;
                  const dueState = getTaskDueState(task);
                  return (
                    <article
                      key={task.id}
                      className={`admin-task-card is-${task.priority}${dueState !== 'none' ? ` due-${dueState}` : ''}${draggedId === task.id ? ' is-dragging' : ''}${canEditContent ? '' : ' is-limited'}`}
                      draggable
                      tabIndex={canEditContent ? 0 : undefined}
                      title={canEditContent ? 'Abrir para editar' : `Criada por ${creator?.name ?? 'outro usuário'}. Somente o autor ou um administrador pode editar.`}
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                      onClick={() => { if (canEditContent) openEdit(task); }}
                      onKeyDown={(event) => { if (canEditContent && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openEdit(task); } }}
                    >
                      <div className="admin-task-card__top"><span className={`admin-task-priority is-${task.priority}`}>{priorityLabels[task.priority]}</span>{dueState === 'overdue' && <span className="admin-task-alert">Atrasada</span>}{dueState === 'today' && <span className="admin-task-alert">Vence hoje</span>}</div>
                      {!canEditContent && <span className="admin-task-readonly"><LockIcon width="12" height="12" />Somente visualização</span>}
                      <h2>{task.title}</h2>
                      {task.description && <p>{task.description}</p>}
                      <footer>
                        {assignee ? <span className="admin-task-assignee" title={assignee.name}><i>{initials(assignee.name)}</i>{assignee.name}</span> : <span className="admin-task-unassigned"><UserIcon width="14" height="14" />Sem responsável</span>}
                        {task.dueDate && <time dateTime={task.dueDate}><ClockIcon width="14" height="14" />{formatTaskDueDate(task.dueDate)}</time>}
                      </footer>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>

      <dialog ref={editorRef} className="admin-task-modal" onClose={() => { setEditingTask(null); setFormError(''); }}>
        <form method="dialog" onSubmit={(event) => { void submitTask(event); }}>
          <header><div><h2>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2><p>{editingTask ? 'Atualize as informações da pendência' : 'Adicione uma pendência ao quadro da equipe'}</p></div><button type="button" onClick={() => editorRef.current?.close()} aria-label="Fechar"><CloseIcon width="20" height="20" /></button></header>
          <label><span className="admin-task-field-label">Título</span><input value={form.title} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} autoFocus /></label>
          <label><span className="admin-task-field-label">Descrição <small>(opcional)</small></span><textarea value={form.description} maxLength={500} rows={4} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="admin-task-form-grid">
            <label><span className="admin-task-field-label">Responsável</span><select value={form.assignedTo} onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}><option value="">Sem responsável</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <label><span className="admin-task-field-label">Prioridade</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label>
            <label><span className="admin-task-field-label">Prazo <small>{isSecretaryEditing ? '(definido na criação)' : '(opcional)'}</small></span><input type="date" value={form.dueDate} disabled={isSecretaryEditing} title={isSecretaryEditing ? 'A data estimada não pode ser alterada após a criação' : undefined} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
          </div>
          {formError && <p className="admin-task-form-error" role="alert">{formError}</p>}
          <footer className="admin-task-modal__actions"><div>{editingTask && <button type="button" className="admin-task-delete" onClick={() => { editorRef.current?.close(); setDeleteTarget(editingTask); }}><TrashIcon width="16" height="16" />Excluir</button>}</div><div><button type="button" className="btn btn-secondary" onClick={() => editorRef.current?.close()}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button></div></footer>
        </form>
      </dialog>

      <dialog ref={deleteRef} className="admin-task-modal admin-task-modal--delete" onClose={() => setDeleteTarget(null)}>
        <div><TrashIcon width="24" height="24" /><h2>Excluir tarefa?</h2><p>Tem certeza que deseja excluir <strong>{deleteTarget?.title}</strong>? Esta ação não pode ser desfeita.</p><footer><button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" className="btn admin-task-confirm-delete" disabled={saving} onClick={() => { void confirmDelete(); }}>Excluir</button></footer></div>
      </dialog>
    </main>
  );
}
