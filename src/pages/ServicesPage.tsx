import { BackLink } from '../components/BackLink';
import { BuildingIcon, CheckIcon } from '../components/icons';
import { useAuth } from '../state/AuthContext';

const WHATSAPP_NUMBER = '5517997529769';

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getWhatsAppUrl(userName: string, serviceName: string) {
  const message = `${getGreeting()}, meu nome é ${userName}! Estou interessado em adquirir o serviço ${serviceName}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const plans = [
  {
    name: 'Endereço Fiscal',
    description: 'Use o endereço da Connect2Work no registro da sua empresa junto aos órgãos públicos.',
    features: ['Válido para abertura de empresa', 'Transferência de endereço fiscal', 'Endereço comercial incluído'],
    featured: false,
  },
  {
    name: 'Endereço Comercial',
    description: 'Use o endereço da Connect2Work como referência profissional para seus clientes.',
    features: ['Referência comercial para clientes', 'Mais credibilidade para sua empresa', 'Serviços adicionais disponíveis'],
    featured: false,
  },
  {
    name: 'Plano de horas',
    description: 'Escolha a modalidade mais adequada à frequência de uso do espaço.',
    features: [
      'Flex mensal: indicado para quem precisa usar o espaço ao longo do mês, mas não tem uma frequência definida.',
      'Flex semestral/anual: para uma necessidade de utilização mais definida, o plano anual oferece o melhor custo-benefício.',
    ],
    featured: true,
  },
] as const;

export function ServicesPage() {
  const { user } = useAuth();
  const userName = user?.name.trim() || 'cliente';

  return (
    <main className="services-page">
      <BackLink to="/unidades" />

      <header className="services-hero">
        <div className="services-hero__icon"><BuildingIcon width="28" height="28" /></div>
        <h1>Serviços para sua empresa <span className="text-accent">crescer</span></h1>
        <p>Use a estrutura Connect2Work para estabelecer uma presença profissional e cuidar do endereço da sua empresa.</p>
      </header>

      <section className="services-plans" aria-labelledby="services-plans-title">
        <div className="services-section-heading">
          <h2 id="services-plans-title">Escolha a solução ideal</h2>
          <p>Valores e condições variam conforme a unidade e o período contratado.</p>
        </div>

        <div className="services-plan-grid">
          {plans.map((plan) => (
            <article className={`service-plan${plan.featured ? ' service-plan--featured' : ''}`} key={plan.name}>
              {plan.featured && <span className="service-plan__badge">Mais completo</span>}
              <div className="service-plan__heading">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>
              <div className="service-plan__price"><strong>Condições sob consulta</strong><span>Conforme unidade e contratação</span></div>
              <a
                href={getWhatsAppUrl(userName, plan.name)}
                className={`btn ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Consultar ${plan.name} pelo WhatsApp`}
              >
                Consultar pelo WhatsApp
              </a>
              <ul className="service-plan__features" aria-label={`Incluído em ${plan.name}`}>
                {plan.features.map((feature) => <li key={feature}><CheckIcon width="18" height="18" /><span>{feature}</span></li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="services-how" aria-labelledby="services-how-title">
        <div><h2 id="services-how-title">Como contratar</h2><p>Ao escolher um serviço, você inicia uma conversa com a equipe pelo WhatsApp.</p></div>
        <ol>
          <li><span>1</span><div><strong>Escolha o serviço</strong><p>Compare as opções conforme a necessidade da empresa.</p></div></li>
          <li><span>2</span><div><strong>Envie a mensagem</strong><p>O WhatsApp abrirá com seu nome e o serviço escolhido já preenchidos.</p></div></li>
          <li><span>3</span><div><strong>Ative seu plano</strong><p>Após a contratação, a equipe orientará os próximos passos.</p></div></li>
        </ol>
      </section>
    </main>
  );
}
