import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { BackLink } from '../components/BackLink';
import { CloseIcon, DoorIcon, ImageIcon, PencilIcon, PlusIcon, TrashIcon, UploadIcon, UsersIcon } from '../components/icons';
import { useAdminRooms } from '../hooks/useAdminRooms';
import type { CreateRoomInput, Room, Unit } from '../types/domain';
import { prepareImageUpload } from '../utils/image-upload';
import '../assets/css/pages/admin-rooms.css';

const MAX_IMAGES = 6;
const AMENITY_SUGGESTIONS = ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor', 'Quadro Branco', 'Videoconferência', 'Café', 'Copa'];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface RoomFormDialogProps {
  room: Room | null;
  units: Unit[];
  isSaving: boolean;
  gatewayError: string;
  onCancel(): void;
  onSave(input: CreateRoomInput, roomId?: string): Promise<boolean>;
}

function RoomFormDialog({ room, units, isSaving, gatewayError, onCancel, onSave }: RoomFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(room?.name ?? '');
  const [unitId, setUnitId] = useState(room?.unitId ?? units[0]?.id ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? ''));
  const [price, setPrice] = useState(String(room?.pricePerHour ?? ''));
  const [images, setImages] = useState<string[]>(room?.imageUrls?.length ? room.imageUrls : room?.imageUrl ? [room.imageUrl] : []);
  const [imageInput, setImageInput] = useState('');
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [amenityInput, setAmenityInput] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => { dialogRef.current?.showModal(); return () => dialogRef.current?.close(); }, []);

  function addImageUrl() {
    const value = imageInput.trim();
    if (!value) return;
    if (images.length >= MAX_IMAGES) return setValidationError(`Adicione no máximo ${MAX_IMAGES} imagens.`);
    if (!(value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/'))) {
      return setValidationError('Use uma URL válida ou um caminho iniciado por /.');
    }
    if (!images.includes(value)) setImages((current) => [...current, value]);
    setImageInput('');
    setValidationError('');
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (images.length + files.length > MAX_IMAGES) {
      setValidationError(`Adicione no máximo ${MAX_IMAGES} imagens.`);
      event.target.value = '';
      return;
    }
    try {
      const uploadedImages = await Promise.all(files.map((file) => prepareImageUpload(file)));
      setImages((current) => [...current, ...uploadedImages]);
      setValidationError('');
    } catch (caughtError) {
      setValidationError(caughtError instanceof Error ? caughtError.message : 'Não foi possível ler as imagens.');
    }
    event.target.value = '';
  }

  function addAmenity(value = amenityInput) {
    const normalized = value.trim();
    if (!normalized) return;
    if (!amenities.some((item) => item.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR'))) {
      setAmenities((current) => [...current, normalized]);
    }
    setAmenityInput('');
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>, add: () => void) {
    if (event.key === 'Enter') { event.preventDefault(); add(); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedCapacity = Number(capacity);
    const parsedPrice = Number(price.replace(',', '.'));
    if (!name.trim() || !unitId) return setValidationError('Preencha nome e unidade.');
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) return setValidationError('Informe uma capacidade inteira maior que zero.');
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return setValidationError('Informe um preço por hora maior que zero.');
    const saved = await onSave({ unitId, name: name.trim(), capacity: parsedCapacity, pricePerHour: parsedPrice, amenities, imageUrl: images[0] ?? null, imageUrls: images }, room?.id);
    if (saved) onCancel();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !isSaving) onCancel();
  }

  return (
    <dialog ref={dialogRef} className="admin-room-modal" aria-labelledby="room-form-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }} onClick={handleBackdropClick}>
      <form className="admin-room-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <header><div><h2 id="room-form-title">{room ? 'Editar Sala' : 'Nova Sala'}</h2><p>{room ? 'Atualize as informações da sala' : 'Cadastre uma nova sala do coworking'}</p></div><button type="button" onClick={onCancel} disabled={isSaving} aria-label="Fechar"><CloseIcon width="20" height="20" /></button></header>
        <div className="admin-room-form__grid">
          <div className="field"><label htmlFor="room-name">Nome da Sala</label><input id="room-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus required /></div>
          <div className="field"><label htmlFor="room-unit">Unidade</label><select id="room-unit" value={unitId} onChange={(event) => setUnitId(event.target.value)} required>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></div>
          <div className="field"><label htmlFor="room-capacity">Capacidade (pessoas)</label><input id="room-capacity" type="number" min="1" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required /></div>
          <div className="field"><label htmlFor="room-price">Preço por Hora (R$)</label><input id="room-price" type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></div>
        </div>
        <div className="admin-room-form__section">
          <label htmlFor="room-image-url">Imagens <span>(máximo {MAX_IMAGES})</span></label>
          <div className="admin-room-form__add-row"><input id="room-image-url" value={imageInput} onChange={(event) => setImageInput(event.target.value)} onKeyDown={(event) => handleInputKeyDown(event, addImageUrl)} placeholder="/images/sala.jpg ou URL" /><button type="button" onClick={addImageUrl} aria-label="Adicionar URL"><PlusIcon width="18" height="18" /></button><button type="button" onClick={() => fileRef.current?.click()} aria-label="Enviar imagens"><UploadIcon width="18" height="18" /></button><input ref={fileRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => void handleFiles(event)} /></div>
          {images.length > 0 && <div className="admin-room-form__image-list">{images.map((image, index) => <div key={`${image.slice(0, 30)}-${index}`}><img src={image} alt={`Prévia ${index + 1}`} /><span>Imagem {index + 1}</span><button type="button" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover imagem ${index + 1}`}><CloseIcon width="14" height="14" /></button></div>)}</div>}
        </div>
        <div className="admin-room-form__section">
          <label htmlFor="room-amenity">Comodidades</label>
          <div className="admin-room-form__add-row"><input id="room-amenity" value={amenityInput} onChange={(event) => setAmenityInput(event.target.value)} onKeyDown={(event) => handleInputKeyDown(event, () => addAmenity())} placeholder="Ex.: TV 55 polegadas" /><button type="button" onClick={() => addAmenity()} aria-label="Adicionar comodidade"><PlusIcon width="18" height="18" /></button></div>
          {amenities.length > 0 && <div className="admin-room-form__tags">{amenities.map((amenity) => <button type="button" key={amenity} onClick={() => setAmenities((current) => current.filter((item) => item !== amenity))}>{amenity}<CloseIcon width="12" height="12" /></button>)}</div>}
          <p className="admin-room-form__suggestions-label">Sugestões:</p><div className="admin-room-form__suggestions">{AMENITY_SUGGESTIONS.filter((suggestion) => !amenities.includes(suggestion)).map((suggestion) => <button type="button" key={suggestion} onClick={() => addAmenity(suggestion)}>+ {suggestion}</button>)}</div>
        </div>
        {(validationError || gatewayError) && <p className="admin-room-form__error" role="alert">{validationError || gatewayError}</p>}
        <footer><button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Salvando…' : 'Salvar'}</button></footer>
      </form>
    </dialog>
  );
}

interface DeleteRoomDialogProps { room: Room; isSaving: boolean; error: string; onCancel(): void; onConfirm(): Promise<void>; }
function DeleteRoomDialog({ room, isSaving, error, onCancel, onConfirm }: DeleteRoomDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="admin-room-modal admin-room-modal--confirm" aria-labelledby="delete-room-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onCancel(); }}><div className="admin-room-confirm"><TrashIcon width="23" height="23" /><h2 id="delete-room-title">Excluir sala?</h2><p>Tem certeza que deseja excluir <strong>{room.name}</strong>? Esta ação não pode ser desfeita.</p>{error && <p className="admin-room-form__error" role="alert">{error}</p>}<footer><button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Manter sala</button><button type="button" className="btn admin-room-danger" onClick={() => void onConfirm()} disabled={isSaving}>{isSaving ? 'Excluindo…' : 'Excluir sala'}</button></footer></div></dialog>;
}

export function AdminRoomsPage() {
  const data = useAdminRooms();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => { if (!status) return; const timer = window.setTimeout(() => setStatus(''), 5000); return () => window.clearTimeout(timer); }, [status]);

  function openCreate() { data.clearMutationError(); setEditingRoom(null); setFormOpen(true); }
  function openEdit(room: Room) { data.clearMutationError(); setEditingRoom(room); setFormOpen(true); }
  async function save(input: CreateRoomInput, id?: string) { const saved = await data.saveRoom(input, id); if (saved) setStatus(id ? 'Sala atualizada com sucesso.' : 'Sala criada com sucesso.'); return saved; }
  async function remove() { if (!deletingRoom) return; if (await data.deleteRoom(deletingRoom.id)) { setStatus('Sala excluída com sucesso.'); setDeletingRoom(null); } }

  return <main className="admin-rooms-page">
    <BackLink to="/admin/dashboard" label="Voltar ao Dashboard" />
    <header className="admin-rooms-page__intro"><div><h1><DoorIcon width="32" height="32" />Gerenciar Salas</h1><p>Cadastre, edite e gerencie as salas do coworking</p></div><button type="button" className="btn btn-primary" onClick={openCreate} disabled={data.units.length === 0}><PlusIcon width="18" height="18" />Nova Sala</button></header>
    {status && <p className="admin-rooms-page__status" role="status">{status}</p>}
    {data.error && <div className="admin-rooms-page__load-error" role="alert"><span>{data.error}</span><button type="button" onClick={() => void data.reload()}>Tentar novamente</button></div>}
    <section className="admin-rooms-card" aria-labelledby="registered-rooms-title" aria-busy={data.isLoading}>
      <header><div><h2 id="registered-rooms-title">Salas Cadastradas</h2><p>Total de {data.rooms.length} salas</p></div><label><span className="sr-only">Filtrar por unidade</span><select value={data.selectedUnitId} onChange={(event) => data.setSelectedUnitId(event.target.value)}><option value="">Todas as unidades</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label></header>
      {data.isLoading ? <div className="admin-rooms-loading" aria-label="Carregando salas"><span /><span /><span /></div> : data.filteredRooms.length === 0 ? <div className="admin-rooms-empty"><DoorIcon width="30" height="30" /><h3>Nenhuma sala encontrada</h3><p>{data.selectedUnitId ? 'Nenhuma sala cadastrada nesta unidade.' : 'Cadastre a primeira sala para começar.'}</p></div> : <div className="admin-rooms-table-wrap"><table className="admin-rooms-table"><thead><tr><th>Sala</th><th>Unidade</th><th>Capacidade</th><th>Preço/Hora</th><th>Imagens</th><th>Comodidades</th><th>Ações</th></tr></thead><tbody>{data.filteredRooms.map(({ room, unitName, imageCount }) => <tr key={room.id}><td data-label="Sala"><strong>{room.name}</strong></td><td data-label="Unidade">{unitName}</td><td data-label="Capacidade"><span className="admin-rooms-table__metric"><UsersIcon width="17" height="17" />{room.capacity}</span></td><td data-label="Preço/Hora"><strong className="admin-rooms-table__price">{money.format(room.pricePerHour)}</strong></td><td data-label="Imagens"><span className="admin-rooms-table__metric"><ImageIcon width="17" height="17" />{imageCount}</span></td><td data-label="Comodidades"><div className="admin-rooms-table__amenities">{room.amenities.slice(0, 2).map((item) => <span key={item}>{item}</span>)}{room.amenities.length > 2 && <span>+{room.amenities.length - 2}</span>}</div></td><td data-label="Ações"><div className="admin-rooms-table__actions"><button type="button" onClick={() => openEdit(room)} aria-label={`Editar ${room.name}`}><PencilIcon width="18" height="18" /></button><button type="button" className="is-danger" onClick={() => { data.clearMutationError(); setDeletingRoom(room); }} aria-label={`Excluir ${room.name}`}><TrashIcon width="18" height="18" /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    {formOpen && <RoomFormDialog room={editingRoom} units={data.units} isSaving={data.isSaving} gatewayError={data.mutationError} onCancel={() => { setFormOpen(false); data.clearMutationError(); }} onSave={save} />}
    {deletingRoom && <DeleteRoomDialog room={deletingRoom} isSaving={data.isSaving} error={data.mutationError} onCancel={() => { setDeletingRoom(null); data.clearMutationError(); }} onConfirm={remove} />}
  </main>;
}
