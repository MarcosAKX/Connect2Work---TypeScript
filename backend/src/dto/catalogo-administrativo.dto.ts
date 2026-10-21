import type { UnidadeDto } from './unidade.dto';
export interface ImagemCatalogo { id: string; url: string; }
export interface UnidadeAdministrativaDto extends UnidadeDto { version: string; imageId: string | null; }
export interface SalaAdministrativaDto { id: string; unitId: string; unitName: string; name: string; capacity: number; pricePerHour: number; amenities: string[]; imageUrl: string | null; imageUrls: string[]; imageIds: string[]; images: ImagemCatalogo[]; version: string; }
export interface PaginaCatalogo<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface ConsultaCatalogo { search: string; page: number; pageSize: number; unitId?: string; }
export interface DadosUnidade { type: 'unit'; name: string; address: string; description: string; latitude: number | null; longitude: number | null; imageId?: string | null; }
export interface DadosSala { type: 'room'; unitId: string; name: string; capacity: number; pricePerHour: number; amenities: string[]; imageIds?: string[]; }
export type TipoServico = 'fiscal_address' | 'commercial_address' | 'hours_plan';
export interface DadosServico { type: 'service'; kind: TipoServico; name: string; description: string; primaryFeatures: string[]; secondaryFeatures: string[]; active: boolean; sortOrder: number; imageId?: string | null; }
export interface ServicoEmpresarialDto extends Omit<DadosServico, 'type'> { id: string; imageUrl: string | null; version: string; }
export type CatalogoDto = UnidadeAdministrativaDto | SalaAdministrativaDto | ServicoEmpresarialDto;
