import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useAdminTasks } from './useAdminTasks';
import type { Task, TaskPriority, TaskStatus, User } from '../types/domain';
type TaskFormState = {
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string;
};

const emptyForm: TaskFormState = {
  title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '',
};

// Coordenação da View: formulário, modais e drag-and-drop.
// Persistência, permissões do domínio e rollback continuam no hook/serviços existentes.
export function useAdminTasksPage(user: User | null) {
  const currentUserId = user?.id ?? '';
  const isAdmin = user?.role === 'admin';
  const {
    columns: taskColumns, staff, filter, setFilter, loading, saving,
    error, notice, createTask, updateTask, moveTask, deleteTask,
  } = useAdminTasks(currentUserId);
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

  function closeEditor() {
    editorRef.current?.close();
  }
  function onEditorClosed() {
    setEditingTask(null);
    setFormError('');
  }
  function requestDelete() {
    editorRef.current?.close();
    setDeleteTarget(editingTask);
  }
  function endDrag() {
    setDraggedId(null);
    setDropTarget(null);
  }
  return {
    currentUserId, isAdmin, taskColumns, staff, filter, setFilter, loading, saving, error, notice,
    editingTask, form, setForm, formError, deleteTarget, setDeleteTarget, draggedId, dropTarget, setDropTarget,
    editorRef, deleteRef, isSecretaryEditing, openCreate, openEdit, submitTask, confirmDelete,
    handleDragStart, handleDrop, closeEditor, onEditorClosed, requestDelete, endDrag,
  };
}
export type AdminTasksViewModel = ReturnType<typeof useAdminTasksPage>;
