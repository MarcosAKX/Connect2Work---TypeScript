import type { ReactNode } from 'react';
import { BuildingIcon, CheckIcon, ClockIcon, UsersIcon } from '../components/icons';
import { ServiceContent } from '../components/services/ServiceContent';
import { ServiceMedia } from '../components/services/ServiceMedia';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../state/AuthContext';
import type { BusinessService } from '../types/domain';

export function ServicesPage() {
  const { user } = useAuth();
  const userName = user?.name.trim() || 'cliente';
  const { fiscal, commercial, hours, isLoading } = useServices();

  function content(item: BusinessService, icon: ReactNode) {
    return (
      <ServiceContent
        icon={icon}
        name={item.name}
        description={item.description}
        primaryFeatures={item.primaryFeatures}
        secondaryFeatures={item.secondaryFeatures}
        userName={userName}
      />
    );
  }

  return <main className="services-page">
    <header className="services-header">
      <h1>Serviços para o seu negócio</h1>
      <p>Soluções inteligentes que dão mais profissionalismo, economia e flexibilidade para sua empresa crescer.</p>
    </header>

    <section className={`services-showcase${isLoading ? ' is-loading' : ''}`} aria-label="Serviços empresariais" aria-busy={isLoading}>
      {fiscal && (
        <article className="service-showcase service-showcase--fiscal">
          {content(fiscal, <BuildingIcon width="27" height="27" />)}
          <ServiceMedia imageUrl={fiscal.imageUrl} alt={`Imagem de ${fiscal.name}`} />
        </article>
      )}

      <div className="services-showcase__pair">
        {commercial && (
          <article className="service-showcase service-showcase--commercial">
            <ServiceMedia imageUrl={commercial.imageUrl} alt={`Imagem de ${commercial.name}`} />
            {content(commercial, <BuildingIcon width="25" height="25" />)}
          </article>
        )}
        {hours && (
          <article className="service-showcase service-showcase--hours">
            <ServiceMedia imageUrl={hours.imageUrl} alt={`Imagem de ${hours.name}`} />
            {content(hours, <ClockIcon width="27" height="27" />)}
          </article>
        )}
      </div>
    </section>

    <section className="services-benefits" aria-label="Benefícios dos serviços">
      <div><span><UsersIcon width="25" height="25" /></span><p><strong>Atendimento nas unidades</strong>Apoio presencial para atender você e sua empresa.</p></div>
      <div><span><CheckIcon width="25" height="25" /></span><p><strong>Contrato flexível</strong>Locações sem burocracia pelo tempo que você precisa</p></div>
      <div><span><BuildingIcon width="25" height="25" /></span><p><strong>Suporte da equipe Connect2Work</strong>Conte com nosso time sempre que precisar.</p></div>
    </section>
  </main>;
}
