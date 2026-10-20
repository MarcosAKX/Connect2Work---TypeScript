import type { UnidadeDto } from './unidade.dto';
export interface ImagemCatalogo { id: string; url: string; }
export interface UnidadeAdministrativaDto extends UnidadeDto { version: string; imageId: string | null; }
export interface SalaAdministrativaDto { id: string; unitId: string; unitName: string; name: string; capacity: number; pricePerHour: number; amenities: string[]; imageUrl: string | null; imageUrls: string[]; imageIds: string[]; images: ImagemCatalogo[]; version: string; }
export interface PaginaCatalogo<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface ConsultaCatalogo { search: string; page: number; pageSize: number; unitId?: string; }
export interface DadosUnidade { type: 'unit'; name: string; address: string; description: string; latitude: number | null; longitude: number | null; imageId?: string | null; }
export interface DadosSala { type: 'room'; unitId: string; name: string; capacity: number; pricePerHour: number; amenities: string[]; imageIds?: string[]; }
export type CatalogoDto = UnidadeAdministrativaDto | SalaAdministrativaDto;
