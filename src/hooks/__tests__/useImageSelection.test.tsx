import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImageSelection } from '../useImageSelection';
const upload = vi.hoisted(() => vi.fn<(file: File) => Promise<{ id: string; expiresAt: string }>>());
vi.mock('../../services', () => ({ services: { images: { upload } } }));
let model: ReturnType<typeof useImageSelection>;
function Probe() { model = useImageSelection([]); return null; }
describe('Seleção de imagens', () => {
  let root: Root; let mounted: boolean; const revoke = vi.fn();
  beforeEach(async () => { mounted = true; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:local'), revokeObjectURL: revoke }); upload.mockReset().mockResolvedValue({ id: 'imagem', expiresAt: new Date(Date.now() + 86400000).toISOString() }); revoke.mockReset(); root = createRoot(document.createElement('div')); await act(async () => root.render(<Probe />)); });
  afterEach(async () => { if (mounted) await act(async () => root.unmount()); vi.unstubAllGlobals(); });
  it('não envia no preview e reaproveita ID ao repetir salvamento; rejeita tamanho e formato', async () => {
    const url = model.select(new File(['imagem'], 'foto.png', { type: 'image/png' })); expect(upload).not.toHaveBeenCalled();
    expect(await model.resolve([url])).toEqual(['imagem']); expect(await model.resolve([url])).toEqual(['imagem']); expect(upload).toHaveBeenCalledOnce();
    expect(() => model.select(new File(['svg'], 'foto.svg', { type: 'image/svg+xml' }))).toThrow('JPEG');
    expect(() => model.select(new File([new Uint8Array(10485761)], 'foto.png', { type: 'image/png' }))).toThrow('10 MiB');
  });
  it('descarta resultado tardio ao fechar e revoga o preview local', async () => {
    let resolve: ((value: { id: string; expiresAt: string }) => void) | undefined; upload.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const url = model.select(new File(['imagem'], 'foto.png', { type: 'image/png' })); const pending = model.resolve([url]); const rejected = expect(pending).rejects.toThrow('encerrado');
    await act(async () => root.unmount()); mounted = false; resolve?.({ id: 'tardia', expiresAt: new Date().toISOString() }); await rejected; expect(revoke).toHaveBeenCalledWith('blob:local');
  });
});
