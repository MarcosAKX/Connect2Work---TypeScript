import type { Room, Unit } from '../types/domain';

export const units: Unit[] = [
  {
    id: 'unit-1',
    name: 'Connect2Work 1',
    address: 'Rua das Empresas, 100 - Centro',
    availableRooms: 5,
    imageUrl: null,
    description: 'Unidade no coração do Centro, com fácil acesso ao metrô e estacionamento conveniado.',
  },
  {
    id: 'unit-2',
    name: 'Connect2Work 2',
    address: 'Av. dos Negócios, 500 - Zona Sul',
    availableRooms: 5,
    imageUrl: null,
    description: 'Espaço moderno na Zona Sul, ideal para reuniões e trabalho em equipe.',
  },
];

export const rooms: Room[] = [
  ['room-1-1', 'unit-1', 'Sala Executive', 8, 80, ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor', 'Quadro Branco']],
  ['room-1-2', 'unit-1', 'Sala Focus', 4, 45, ['Wi-Fi', 'Ar Condicionado']],
  ['room-1-3', 'unit-1', 'Sala Brainstorm', 12, 120, ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor', 'Videoconferência']],
  ['room-1-4', 'unit-1', 'Sala Solo', 1, 25, ['Wi-Fi', 'Ar Condicionado']],
  ['room-1-5', 'unit-1', 'Sala Meeting', 6, 60, ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor']],
  ['room-2-1', 'unit-2', 'Sala Horizon', 10, 90, ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor', 'Café']],
  ['room-2-2', 'unit-2', 'Sala Compact', 3, 40, ['Wi-Fi', 'Ar Condicionado']],
  ['room-2-3', 'unit-2', 'Sala Board', 14, 130, ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor', 'Videoconferência', 'Som Ambiente']],
  ['room-2-4', 'unit-2', 'Sala Quiet', 2, 35, ['Wi-Fi', 'Ar Condicionado', 'Iluminação Ajustável']],
  ['room-2-5', 'unit-2', 'Sala Connect', 6, 65, ['Wi-Fi', 'Ar Condicionado', 'TV', 'Projetor']],
].map(([id, unitId, name, capacity, pricePerHour, amenities]) => ({
  id: id as string,
  unitId: unitId as string,
  name: name as string,
  capacity: capacity as number,
  pricePerHour: pricePerHour as number,
  amenities: amenities as string[],
  imageUrl: null,
}));
