export interface UnidadeDto {
  id: string; name: string; address: string; availableRooms: number; imageUrl: string | null;
  description?: string; latitude?: number; longitude?: number;
}
