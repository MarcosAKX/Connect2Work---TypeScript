import { describe, expect, it } from 'vitest';
import { getRoomImages } from './room-images';

describe('getRoomImages', () => {
  it('mantém galeria sem duplicar imagem principal', () => {
    expect(getRoomImages({
      imageUrl: '/images/principal.jpg',
      imageUrls: ['/images/principal.jpg', '/images/lateral.jpg'],
    })).toEqual(['/images/principal.jpg', '/images/lateral.jpg']);
  });

  it('usa imageUrl quando galeria não existe', () => {
    expect(getRoomImages({ imageUrl: '/images/unica.jpg' })).toEqual(['/images/unica.jpg']);
  });
});
