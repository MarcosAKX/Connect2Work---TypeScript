const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validBrazilianDdds = new Set([
  '11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38',
  '41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69',
  '71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99',
]);

export function emailError(value: string) {
  const email = value.trim();
  if (!email) return 'Informe seu e-mail.';
  if (email.length > 254 || !emailPattern.test(email) || email.includes('..')) return 'Digite um e-mail válido.';
  return null;
}

export function fullNameError(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.some((part) => part.length < 2)) return 'Informe seu nome e sobrenome.';
  if (value.trim().length > 100) return 'Use no máximo 100 caracteres.';
  return null;
}

export function professionError(value: string) {
  const profession = value.trim();
  if (profession.length < 2) return 'Informe sua profissão.';
  if (profession.length > 80) return 'Use no máximo 80 caracteres.';
  return null;
}

export function phoneError(value: string) {
  const digits = value.replace(/\D/g, '');
  if (![10, 11].includes(digits.length)) return 'Digite um telefone com DDD. Ex: (11) 98765-4321';
  if (!validBrazilianDdds.has(digits.slice(0, 2))) return 'Digite um DDD válido.';
  if (/^(\d)\1+$/.test(digits)) return 'Digite um telefone válido.';
  if (digits.length === 11 && digits[2] !== '9') return 'Celular deve começar com 9 após o DDD.';
  return null;
}

export function passwordError(value: string) {
  if (value.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  if (value.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  if (/\s/.test(value)) return 'A senha não pode conter espaços.';
  return null;
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
