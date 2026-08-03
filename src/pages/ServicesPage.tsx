import { useEffect, useState, type ReactNode } from 'react';
import { BuildingIcon, CheckIcon, ClockIcon, UsersIcon } from '../components/icons';
import { services } from '../services';
import { useAuth } from '../state/AuthContext';
import type { BusinessService } from '../types/domain';

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

interface ServiceMediaProps {
  imageUrl: string | null;
  alt: string;
}

function ServiceMedia({ imageUrl, alt }: ServiceMediaProps) {
  return imageUrl
    ? <img className="service-showcase__image" src={imageUrl} alt={alt} />
    : <div className="service-showcase__image-fallback" role="img" aria-label={`${alt}. Imagem ainda não cadastrada.`}><span>C2W</span><small>Imagem disponível após cadastro administrativo</small></div>;
}

interface ServiceContentProps {
  icon: ReactNode;
  name: string;
  description: string;
  primaryFeatures: readonly string[];
  secondaryFeatures: readonly string[];
  userName: string;
  children?: ReactNode;
}

function ServiceContent({ icon, name, description, primaryFeatures, secondaryFeatures, userName, children }: ServiceContentProps) {
  return <div className="service-showcase__content">
    <div className="service-showcase__heading"><span>{icon}</span><div><h2>{name}</h2><p>{description}</p></div></div>
    {children}
    {secondaryFeatures.length > 0 ? <div className="service-showcase__plan-options"><div><strong>Flex mensal</strong><FeatureList items={primaryFeatures} /></div><div><strong>Flex semestral/anual</strong><FeatureList items={secondaryFeatures} /></div></div> : <FeatureList items={primaryFeatures} />}
    <div className="service-showcase__actions">
      <a className="btn btn-primary" href={getWhatsAppUrl(userName, name)} target="_blank" rel="noreferrer">Consultar nas unidades</a>
      <span>Condições sob consulta</span>
    </div>
  </div>;
}

function FeatureList({ items }: { items: readonly string[] }) {
  return items.length > 0 ? <ul>{items.map((feature) => <li key={feature}><CheckIcon width="17" height="17" /><span>{feature}</span></li>)}</ul> : null;
}

export function ServicesPage() {
  const { user } = useAuth();
  const userName = user?.name.trim() || 'cliente';
  const [items, setItems] = useState<BusinessService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void services.businessServices.listServices().then((nextItems) => { if (active) setItems(nextItems); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const fiscal = items.find(({ kind }) => kind === 'fiscal_address');
  const commercial = items.find(({ kind }) => kind === 'commercial_address');
  const hours = items.find(({ kind }) => kind === 'hours_plan');

  function content(item: BusinessService, icon: ReactNode) {
    return <ServiceContent icon={icon} name={item.name} description={item.description} primaryFeatures={item.primaryFeatures} secondaryFeatures={item.secondaryFeatures} userName={userName} />;
  }

  return <main className="services-page">
    <header className="services-header">
      <h1>Serviços para o seu negócio</h1>
      <p>Soluções inteligentes que dão mais profissionalismo e flexibilidade para sua empresa crescer.</p>
    </header>

    <section className={`services-showcase${isLoading ? ' is-loading' : ''}`} aria-label="Serviços empresariais" aria-busy={isLoading}>
      {fiscal && <article className="service-showcase service-showcase--fiscal">{content(fiscal, <BuildingIcon width="27" height="27" />)}<ServiceMedia imageUrl={fiscal.imageUrl} alt={`Imagem de ${fiscal.name}`} /></article>}

      <div className="services-showcase__pair">
        {commercial && <article className="service-showcase service-showcase--commercial"><ServiceMedia imageUrl={commercial.imageUrl} alt={`Imagem de ${commercial.name}`} />{content(commercial, <BuildingIcon width="25" height="25" />)}</article>}
        {hours && <article className="service-showcase service-showcase--hours"><ServiceMedia imageUrl={hours.imageUrl} alt={`Imagem de ${hours.name}`} />{content(hours, <ClockIcon width="27" height="27" />)}</article>}
      </div>
    </section>

    <section className="services-benefits" aria-label="Benefícios dos serviços">
      <div><span><UsersIcon width="25" height="25" /></span><p><strong>Atendimento nas unidades</strong>Apoio presencial para atender você e sua empresa.</p></div>
      <div><span><CheckIcon width="25" height="25" /></span><p><strong>Contrato flexível</strong>Mais liberdade para ajustar conforme sua necessidade.</p></div>
      <div><span><BuildingIcon width="25" height="25" /></span><p><strong>Suporte da equipe C2W</strong>Conte com nosso time sempre que precisar.</p></div>
    </section>
  </main>;
}
