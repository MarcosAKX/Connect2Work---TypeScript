export interface SalaDto {
  id: string; unitId: string; name: string; capacity: number; pricePerHour: number;
  amenities: string[]; imageUrl: string | null; imageUrls?: string[]; imageCardUrls?: string[];
}
