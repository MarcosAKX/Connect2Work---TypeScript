import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { it, expect } from 'vitest';
import { vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PendingBookingReceipt } from '../PendingBookingReceipt';
import type { Booking } from '../../../types/domain';
const room={id:'r',unitId:'u',name:'Sala',capacity:4,pricePerHour:50,amenities:[],imageUrls:[],imageUrl:''};
const unit={id:'u',name:'Unidade',address:'Rua',availableRooms:1,imageUrl:null};
it.each(['pending','cancelled','confirmed'] as const)('recibo conserva a situação %s sem afirmar pagamento',adminStatus=>{
  const booking:Booking={id:'protocolo',userId:'c',unitId:'u',roomId:'r',date:'2030-10-21',timeSlot:'08:00 - 09:00',status:adminStatus==='cancelled'?'cancelled':'upcoming',adminStatus,total:50,createdAt:'2030-10-20T12:00:00Z'};
  const html=renderToStaticMarkup(<MemoryRouter><PendingBookingReceipt booking={booking} room={room} unit={unit} onNewSelection={()=>{}}/></MemoryRouter>);
  expect(html).toContain(adminStatus==='cancelled'?'Agendamento cancelado':adminStatus==='confirmed'?'Confirmado':'Pendente de confirmação');
  expect(html).toContain('Nenhum pagamento foi realizado nesta etapa.');expect(html).toContain('protocolo');expect(html).not.toContain('/pagamento-confirmado');
  if (adminStatus !== 'cancelled') {
    expect(html).toContain('Forma de Pagamento');expect(html).toContain('PIX');expect(html).toContain('Cartão de Crédito/Débito');expect(html).toContain('payment-layout');
  }
  expect(html).not.toContain('connect2work-pagamento-mock');
});
it('reconciliação de período passado informa encerramento e nenhuma nova reserva',()=>{
  const booking:Booking={id:'antigo',userId:'c',unitId:'u',roomId:'r',date:'2026-01-01',timeSlot:'08:00 - 09:00',status:'past',adminStatus:'pending',total:50,createdAt:'2025-12-31T12:00:00Z'};
  const html=renderToStaticMarkup(<MemoryRouter><PendingBookingReceipt booking={booking} room={room} unit={unit} onNewSelection={()=>{}}/></MemoryRouter>);
  expect(html).toContain('Período encerrado');expect(html).toContain('Nenhuma nova reserva foi criada.');expect(html).not.toContain('Aguarde a confirmação');
});
it('mantém PIX/cartão sem coletar dados e conclui no painel visual antigo',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
  const container=document.createElement('div'),root=createRoot(container);
  const booking:Booking={id:'protocolo-real',userId:'c',unitId:'u',roomId:'r',date:'2030-10-21',timeSlot:'08:00 - 09:00',status:'upcoming',adminStatus:'pending',total:50,createdAt:'2030-10-20T12:00:00Z'};
  try {
    await act(async()=>root.render(<MemoryRouter><PendingBookingReceipt booking={booking} room={room} unit={unit} onNewSelection={()=>{}}/></MemoryRouter>));
    await act(async()=>container.querySelectorAll('button[role="radio"]')[1]?.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(container.querySelectorAll('.card-payment input')).toHaveLength(4);
    expect([...container.querySelectorAll('.card-payment input')].every(input=>input.hasAttribute('disabled'))).toBe(true);
    await act(async()=>container.querySelector('form')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(container.querySelector('.confirmation-panel')).not.toBeNull();expect(container.querySelector('.confirmation-success-icon')).not.toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('Agendamento solicitado!');expect(container.textContent).toContain('Pendente de confirmação');expect(container.textContent).toContain('protocolo-real');expect(container.textContent).not.toContain('Pagamento aprovado');
  }finally{await act(async()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();}
});
