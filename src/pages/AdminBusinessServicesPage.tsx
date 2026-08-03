import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { BackLink } from '../components/BackLink';
import { BuildingIcon, CloseIcon, ImageIcon, PencilIcon, UploadIcon } from '../components/icons';
import { useAdminBusinessServices } from '../hooks/useAdminBusinessServices';
import type { BusinessService, UpdateBusinessServiceInput } from '../types/domain';
import { prepareImageUpload } from '../utils/image-upload';
import '../assets/css/pages/admin-business-services.css';

function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }

function ServiceDialog({ item, saving, error, onClose, onSave }: { item: BusinessService; saving: boolean; error: string; onClose(): void; onSave(input: UpdateBusinessServiceInput): Promise<boolean> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [primary, setPrimary] = useState(item.primaryFeatures.join('\n'));
  const [secondary, setSecondary] = useState(item.secondaryFeatures.join('\n'));
  const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const [active, setActive] = useState(item.active);
  const [validationError, setValidationError] = useState('');
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { setImageUrl(await prepareImageUpload(file)); setValidationError(''); }
    catch (caught) { setValidationError(caught instanceof Error ? caught.message : 'Não foi possível processar a imagem.'); }
    event.target.value = '';
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) return setValidationError('Informe nome e descrição.');
    if (await onSave({ kind: item.kind, name: name.trim(), description: description.trim(), primaryFeatures: lines(primary), secondaryFeatures: lines(secondary), imageUrl, active, sortOrder: item.sortOrder })) onClose();
  }
  return <dialog ref={ref} className="admin-service-modal" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={(event) => void submit(event)}>
      <header><div><h2>Editar {item.name}</h2><p>Conteúdo exibido na página Serviços.</p></div><button type="button" onClick={onClose} aria-label="Fechar"><CloseIcon width="20" height="20" /></button></header>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
      <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={300} required /></label>
      <div className="admin-service-modal__columns"><label>Benefícios — coluna 1<textarea value={primary} onChange={(event) => setPrimary(event.target.value)} rows={6} placeholder="Um benefício por linha" /></label>{item.kind === 'hours_plan' && <label>Benefícios — coluna 2<textarea value={secondary} onChange={(event) => setSecondary(event.target.value)} rows={6} placeholder="Um benefício por linha" /></label>}</div>
      <section className="admin-service-modal__image"><div><strong>Imagem do serviço</strong><span>JPEG, PNG ou WebP, até 2 MB. Prefira formato horizontal.</span></div>{imageUrl && <img src={imageUrl} alt="Prévia do serviço" />}<div><button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><UploadIcon width="18" height="18" />Enviar imagem</button>{imageUrl && <button type="button" className="btn btn-secondary" onClick={() => setImageUrl(null)}>Remover</button>}<input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} /></div></section>
      <label className="admin-service-modal__toggle"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span>Serviço ativo e visível para clientes</span></label>
      {(validationError || error) && <p className="admin-service-modal__error" role="alert">{validationError || error}</p>}
      <footer><button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></footer>
    </form>
  </dialog>;
}

export function AdminBusinessServicesPage() {
  const data = useAdminBusinessServices();
  const [editing, setEditing] = useState<BusinessService | null>(null);
  const [status, setStatus] = useState('');
  async function save(input: UpdateBusinessServiceInput) { if (!editing) return false; const ok = await data.update(editing.id, input); if (ok) setStatus('Serviço atualizado com sucesso.'); return ok; }
  return <main className="admin-services-page"><BackLink to="/admin" label="Voltar ao Dashboard" />
    <header className="admin-services-page__intro"><div><h1><BuildingIcon width="31" height="31" />Gerenciar Serviços</h1><p>Edite conteúdo e imagens da vitrine de serviços empresariais.</p></div></header>
    {status && <p className="admin-services-page__status" role="status">{status}</p>}
    {data.error && !editing && <p className="admin-services-page__error" role="alert">{data.error}</p>}
    <section className="admin-services-grid" aria-busy={data.isLoading}>{data.isLoading ? <p>Carregando serviços…</p> : data.items.map((item) => <article key={item.id} className={!item.active ? 'is-inactive' : ''}>
      <div className="admin-services-card__media">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <ImageIcon width="30" height="30" />}</div>
      <div className="admin-services-card__body"><div><span>{item.active ? 'Ativo' : 'Inativo'}</span><h2>{item.name}</h2><p>{item.description}</p></div><button type="button" className="btn btn-secondary" onClick={() => { data.setError(''); setEditing(item); }}><PencilIcon width="17" height="17" />Editar</button></div>
    </article>)}</section>
    {editing && <ServiceDialog item={editing} saving={data.isSaving} error={data.error} onClose={() => { setEditing(null); data.setError(''); }} onSave={save} />}
  </main>;
}
