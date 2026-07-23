import type { Room } from '../types/domain';

export function getRoomImages(room: Pick<Room, 'imageUrl' | 'imageUrls'>): string[] {
  return Array.from(new Set(
    [...(room.imageUrls ?? []), room.imageUrl]
      .filter((image): image is string => Boolean(image?.trim()))
      .map((image) => image.trim()),
  ));
}
