import {it,expect} from 'vitest';
import {businessDateKey,businessWallDate} from '../business-time';
it('datas operacionais usam São Paulo mesmo na virada de dia UTC',()=>{expect(businessDateKey('2026-10-20T01:00:00Z')).toBe('2026-10-19');const d=businessWallDate('2026-10-20T01:00:00Z');expect(d.getDate()).toBe(19);expect(d.getHours()).toBe(22);});

import {formatCheckInTime as agendaTime} from '../../features/agendamentos/formatters';
import {formatCheckInTime as panelTime} from '../../features/painel-do-dia/daily-panel';
it('check-in exibe horário comercial independente do dispositivo',()=>{expect(agendaTime('2026-10-20T15:00:00Z')).toBe('12:00');expect(panelTime('2026-10-20T15:00:00Z')).toBe('12:00');});
