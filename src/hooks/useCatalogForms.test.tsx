import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useUnitForm } from './useUnitForm';
import { useRoomForm } from './useRoomForm';
const mocks = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue(false), upload: vi.fn() }));
vi.mock('../services', () => ({ services: { images: { upload: mocks.upload } } }));
let root: Root; let container: HTMLDivElement; let roomModel: ReturnType<typeof useRoomForm>;
const legacy = 'legacy:11111111-1111-4111-8111-111111111111';
function UnitProbe() { const form = useUnitForm({ unit: { id: 'u', name: 'Unidade', address: 'Rua', availableRooms: 0, imageUrl: null, imageId: legacy }, onCancel() {}, onSave: mocks.save }); return <form onSubmit={event => void form.handleSubmit(event)} />; }
function RoomProbe() { roomModel = useRoomForm({ room: { id: 's', unitId: 'u', name: 'Sala', capacity: 4, pricePerHour: 50, amenities: [], imageUrl: null, images: [], imageIds: [legacy] }, units: [{ id: 'u', name: 'Unidade' }], onCancel() {}, onSave: mocks.save }); return <form onSubmit={event => void roomModel.handleSubmit(event)} />; }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); root = createRoot(container); mocks.save.mockClear(); mocks.upload.mockClear(); });
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
const submit = async () => { await act(async () => container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); };
it('edição da unidade mantém referência antiga sem prévia e sem novo upload', async () => {
  await act(async () => root.render(<UnitProbe />)); await submit(); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ imageId: legacy }), 'u'); expect(mocks.upload).not.toHaveBeenCalled();
});
it('edição da sala preserva foto sem prévia e só a remove por ação explícita', async () => {
  await act(async () => root.render(<RoomProbe />)); await submit(); expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ imageIds: [legacy] }), 's');
  await act(async () => roomModel.removeHiddenImages()); await submit(); expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ imageIds: [] }), 's'); expect(mocks.upload).not.toHaveBeenCalled();
});
