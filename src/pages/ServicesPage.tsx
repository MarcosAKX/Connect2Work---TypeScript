import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { BuildingIcon, CheckIcon } from '../components/icons';

const plans = [
  {
    name: 'Endereço Fiscal',
    description: 'Para formalizar sua empresa com um endereço profissional.',
    features: ['Endereço para registro empresarial', 'Recebimento de correspondências', 'Aviso de novas correspondências'],
    featured: false,
  },
  {
    name: 'Endereço Comercial',
    description: 'Para fortalecer a presença da sua marca sem manter uma sala fixa.',
    features: ['Endereço para divulgação comercial', 'Referência profissional para sua empresa', 'Recebimento de correspondências'],
    featured: false,
  },
  {
    name: 'Plano Completo',
    description: 'Endereço fiscal e comercial reunidos em uma única solução.',
    features: ['Benefícios dos dois serviços', 'Gestão centralizada de correspondências', 'Atendimento prioritário'],
    featured: true,
  },
] as const;

export function ServicesPage() {
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
              <Link to="/unidades" className={`btn ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}>Consultar nas unidades</Link>
              <ul className="service-plan__features" aria-label={`Incluído em ${plan.name}`}>
                {plan.features.map((feature) => <li key={feature}><CheckIcon width="18" height="18" /><span>{feature}</span></li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="services-how" aria-labelledby="services-how-title">
        <div><h2 id="services-how-title">Como contratar</h2><p>A contratação digital será disponibilizada quando o canal comercial estiver integrado.</p></div>
        <ol>
          <li><span>1</span><div><strong>Escolha o serviço</strong><p>Compare as opções conforme a necessidade da empresa.</p></div></li>
          <li><span>2</span><div><strong>Consulte uma unidade</strong><p>Confirme disponibilidade, documentos, valores e condições.</p></div></li>
          <li><span>3</span><div><strong>Ative seu plano</strong><p>Após a contratação, a equipe orientará os próximos passos.</p></div></li>
        </ol>
      </section>
    </main>
  );
}
