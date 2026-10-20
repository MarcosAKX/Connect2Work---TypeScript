const WHATSAPP_NUMBER = '5517997529769';

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getWhatsAppUrl(userName: string, serviceName: string) {
  const message = `${getGreeting()}, meu nome é ${userName}! Estou interessado em adquirir o serviço ${serviceName}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
