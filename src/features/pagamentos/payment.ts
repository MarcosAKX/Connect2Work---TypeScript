export type PaymentMethod = 'pix' | 'card';

export interface CardForm {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
}

export function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function validateCard(card: CardForm) {
  if (card.holder.trim().length < 3) return 'Informe o nome impresso no cartão.';
  if (card.number.replace(/\D/g, '').length !== 16) return 'Informe um número de cartão válido.';
  const [month, year] = card.expiry.split('/').map(Number);
  if (!month || month < 1 || month > 12 || !year) return 'Informe a validade no formato MM/AA.';
  if (card.cvv.length !== 3) return 'Informe o CVV com 3 números.';
  return null;
}
