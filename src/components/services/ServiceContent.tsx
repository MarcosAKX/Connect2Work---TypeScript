import type { ReactNode } from 'react';
import { CheckIcon } from '../icons';
import { getWhatsAppUrl } from '../../utils/service-contact';

interface ServiceContentProps {
  icon: ReactNode;
  name: string;
  description: string;
  primaryFeatures: readonly string[];
  secondaryFeatures: readonly string[];
  userName: string;
  children?: ReactNode;
}

export function ServiceContent({ icon, name, description, primaryFeatures, secondaryFeatures, userName, children }: ServiceContentProps) {
  return <div className="service-showcase__content">
    <div className="service-showcase__heading">
      <span>{icon}</span>
      <div><h2>{name}</h2><p>{description}</p></div>
    </div>
    {children}
    {secondaryFeatures.length > 0 ? (
      <div className="service-showcase__plan-options">
        <div><strong>Flex mensal</strong><FeatureList items={primaryFeatures} /></div>
        <div><strong>Flex semestral/anual</strong><FeatureList items={secondaryFeatures} /></div>
      </div>
    ) : <FeatureList items={primaryFeatures} />}
    <div className="service-showcase__actions">
      <a className="btn btn-primary" href={getWhatsAppUrl(userName, name)} target="_blank" rel="noreferrer">Consultar nas unidades</a>
      <span>Condições sob consulta</span>
    </div>
  </div>;
}

function FeatureList({ items }: { items: readonly string[] }) {
  return items.length > 0 ? (
    <ul>
      {items.map((feature) => (
        <li key={feature}><CheckIcon width="17" height="17" /><span>{feature}</span></li>
      ))}
    </ul>
  ) : null;
}
