import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../state/AuthContext';
import { services } from '../services';
import { createLocalStorageServices } from '../services/local-storage';
import type { Task, User } from '../types/domain';
import { AdminTasksPage } from './AdminTasksPage';

describe('AdminTasksPage — quadro e permissões', () => {
  let container: HTMLDivElement;
  let root: Root;
  let admin: User;
  let secretary: User;
  const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 9, 12));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    // jsdom não fornece o ciclo de vida nativo de dialog; simular abertura e evento close.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { if (!this.open) return; this.open = false; this.dispatchEvent(new Event('close')); } });
    localStorage.clear();
    sessionStorage.clear();
    createLocalStorageServices();
    admin = await services.auth.login('admin@connect2work.com', 'admin123');
    secretary = await services.auth.login('secretaria@connect2work.com', 'secretaria123');
    const base: Task = { id: 'own', title: 'Tarefa própria', description: 'Preparar sala', status: 'todo', assignedTo: admin.id, priority: 'high', dueDate: '2026-08-08', createdBy: secretary.id, createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z' };
    const tasks: Task[] = [base,
      { ...base, id: 'other', title: 'Tarefa de outro autor', createdBy: admin.id, assignedTo: secretary.id, status: 'in_progress', priority: 'medium', dueDate: '2026-08-09' },
      { ...base, id: 'done', title: 'Tarefa concluída', status: 'done', assignedTo: undefined, dueDate: undefined, priority: 'low' },
    ];
    localStorage.setItem('c2w_mock_tasks', JSON.stringify(tasks));
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function mount() { await act(async () => root.render(<AuthProvider><AdminTasksPage /></AuthProvider>)); }
  function element<T extends Element>(selector: string): T {
    const found = container.querySelector<T>(selector);
    if (!found) throw new Error(`Elemento ausente: ${selector}`);
    return found;
  }
  function card(title: string) {
    const found = [...container.querySelectorAll<HTMLElement>('.admin-task-card')].find((item) => item.querySelector('h2')?.textContent === title);
    if (!found) throw new Error(`Tarefa ausente: ${title}`);
    return found;
  }
  async function click(selector: string) { await act(async () => element<HTMLButtonElement>(selector).click()); }
  async function edit(title: string) { await act(async () => card(title).click()); }
  async function change(selector: string, value: string) {
    const input = element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector);
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }
  async function submit() { await act(async () => element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
  async function saved(id: string) { return (await services.tasks.listTasks()).find((task) => task.id === id); }
  function editor() { return element<HTMLDialogElement>('dialog:not(.admin-task-modal--delete)'); }
  async function move(title: string, column: number) {
    const values = new Map<string, string>();
    const transfer = { effectAllowed: '', dropEffect: '', setData(type: string, value: string) { values.set(type, value); }, getData(type: string) { return values.get(type) ?? ''; } };
    async function fire(target: Element, name: string) {
      const event = new Event(name, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: transfer });
      await act(async () => target.dispatchEvent(event));
    }
    await fire(card(title), 'dragstart');
    const target = element(`.admin-task-column:nth-child(${column})`);
    await fire(target, 'dragover');
    expect(target.classList.contains('is-drop-target')).toBe(true);
    await fire(target, 'drop');
  }

  it('organiza etapas e filtra Minhas tarefas por responsável, não por autor', async () => {
    await mount();
    expect([...container.querySelectorAll('.admin-task-column > header strong')].map((item) => item.textContent)).toEqual(['1', '1', '1']);
    expect(card('Tarefa própria').textContent).toContain('Atrasada');
    expect(card('Tarefa de outro autor').textContent).toContain('Vence hoje');
    await click('.admin-tasks-filter button:nth-child(2)');
    expect(container.querySelectorAll('.admin-task-card')).toHaveLength(1);
    expect(card('Tarefa de outro autor').classList.contains('is-limited')).toBe(true);
    await click('.admin-tasks-filter button:first-child');
    expect(container.querySelectorAll('.admin-task-card')).toHaveLength(3);
  });

  it('secretária não abre edição de outra pessoa por clique nem teclado', async () => {
    await mount();
    await edit('Tarefa de outro autor');
    expect(editor().open).toBe(false);
    await act(async () => card('Tarefa de outro autor').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(editor().open).toBe(false);
    expect(card('Tarefa de outro autor').getAttribute('tabindex')).toBeNull();
  });

  it('secretária edita tarefa própria, mantendo prazo original bloqueado', async () => {
    await mount();
    await edit('Tarefa própria');
    expect(editor().open).toBe(true);
    expect(element<HTMLInputElement>('form input[type="date"]').disabled).toBe(true);
    await change('form input[maxlength="120"]', 'Título atualizado');
    await change('form textarea', 'Descrição atualizada');
    await change('.admin-task-form-grid label:nth-child(2) select', 'low');
    await submit();
    expect(await saved('own')).toMatchObject({ title: 'Título atualizado', description: 'Descrição atualizada', priority: 'low', dueDate: '2026-08-08' });
    expect(editor().open).toBe(false);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTime(4500));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('admin edita tarefa de qualquer autor, incluindo prazo', async () => {
    await services.auth.login('admin@connect2work.com', 'admin123');
    await mount();
    await act(async () => card('Tarefa própria').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(editor().open).toBe(true);
    expect(element<HTMLInputElement>('form input[type="date"]').disabled).toBe(false);
    await change('form input[type="date"]', '2026-08-20');
    await submit();
    expect((await saved('own'))?.dueDate).toBe('2026-08-20');
  });

  it('criação exige título e permite secretária definir prazo, responsável e prioridade', async () => {
    await mount();
    await click('.admin-tasks-create');
    await submit();
    expect(container.querySelector('.admin-task-form-error')?.textContent).toContain('Informe o título');
    expect(await services.tasks.listTasks()).toHaveLength(3);
    expect(element<HTMLInputElement>('form input[type="date"]').disabled).toBe(false);
    await change('form input[maxlength="120"]', 'Nova pendência');
    await change('form input[type="date"]', '2026-08-15');
    await change('.admin-task-form-grid label:first-child select', secretary.id);
    await change('.admin-task-form-grid label:nth-child(2) select', 'high');
    await submit();
    const created = (await services.tasks.listTasks()).find((task) => task.title === 'Nova pendência');
    expect(created).toMatchObject({ createdBy: secretary.id, assignedTo: secretary.id, dueDate: '2026-08-15', priority: 'high', status: 'todo' });
    expect(editor().open).toBe(false);
    await click('.admin-tasks-create');
    expect(element<HTMLInputElement>('form input[maxlength="120"]').value).toBe('');
    expect(container.querySelector('.admin-task-form-error')).toBeNull();
  });

  it.each(['admin', 'secretaria'] as const)('exclusão por %s exige confirmação e remove a tarefa correta', async (role) => {
    await services.auth.login(`${role}@connect2work.com`, role === 'admin' ? 'admin123' : 'secretaria123');
    await mount();
    await edit('Tarefa própria');
    await click('.admin-task-delete');
    expect(editor().open).toBe(false);
    expect(element<HTMLDialogElement>('.admin-task-modal--delete').open).toBe(true);
    expect(await saved('own')).toBeDefined();
    await click('.admin-task-modal--delete .btn-secondary');
    expect(await saved('own')).toBeDefined();
    await edit('Tarefa própria');
    await click('.admin-task-delete');
    await click('.admin-task-confirm-delete');
    expect(await saved('own')).toBeUndefined();
    expect(await saved('other')).toBeDefined();
    expect(element<HTMLDialogElement>('.admin-task-modal--delete').open).toBe(false);
  });

  it('secretária pode mover tarefa de outro autor sem editar seu conteúdo', async () => {
    await mount();
    await move('Tarefa de outro autor', 3);
    expect(await saved('other')).toMatchObject({ status: 'done', title: 'Tarefa de outro autor', createdBy: admin.id });
    expect(element('.admin-task-column:nth-child(3)').contains(card('Tarefa de outro autor'))).toBe(true);
    expect(container.querySelector('.is-drop-target')).toBeNull();
    expect(container.querySelector('.is-dragging')).toBeNull();
    expect(editor().open).toBe(false);
  });

  it('falha ao mover restaura coluna anterior e apresenta erro', async () => {
    await mount();
    // Falha no limite de persistência: exercita rollback real do hook.
    vi.spyOn(services.tasks, 'updateTaskStatus').mockRejectedValueOnce(new Error('Falha de gravação'));
    await move('Tarefa própria', 3);
    expect((await saved('own'))?.status).toBe('todo');
    expect(element('.admin-task-column:first-child').contains(card('Tarefa própria'))).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Falha de gravação');
  });

  it('erro ao salvar mantém edição aberta e conteúdo persistido intacto', async () => {
    await mount();
    await edit('Tarefa própria');
    await change('form input[maxlength="120"]', 'Não salvar');
    vi.spyOn(services.tasks, 'updateTask').mockRejectedValueOnce(new Error('Falha de gravação'));
    await submit();
    expect(editor().open).toBe(true);
    expect((await saved('own'))?.title).toBe('Tarefa própria');
    expect(container.querySelector('.admin-tasks-error')?.textContent).toBe('Falha de gravação');
  });
});
