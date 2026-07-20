import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { services } from '../services';
import type { Unit } from '../types/domain';

export function UnitsPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    void services.catalog.getUnits().then(setUnits);
  }, []);

  return (
    <main className="units-page">
      <button type="button" className="page-back migration-back-button" onClick={() => navigate(-1)}><ArrowLeftIcon width="16" height="16" />Voltar</button>
      <section className="units-hero">
        <h1>Escolha uma <span className="text-accent">Unidade</span></h1>
        <p className="units-subtitle">Selecione a unidade Connect2Work mais conveniente para você</p>
      </section>
      <section className="units-grid" aria-label="Unidades disponíveis">
        {units.map((unit, index) => (
          <Link key={unit.id} to={`/salas?unidade=${encodeURIComponent(unit.id)}`} className="unit-card card" aria-label={`Ver salas de ${unit.name}`}>
            <div className="unit-card__visual" aria-hidden="true">
              {unit.imageUrl ? <img className="unit-card__image" src={unit.imageUrl} alt="" /> : <><span className="unit-card__glow" /><span className="unit-card__number">{index + 1}</span></>}
            </div>
            <div className="unit-card__body">
              <div className="unit-card__header"><h2 className="unit-card__name">{unit.name}</h2><span className="unit-card__action" aria-hidden="true">→</span></div>
              <p className="unit-card__meta">⌖ {unit.address}</p>
              <p className="unit-card__rooms">⌂ {unit.availableRooms} salas disponíveis</p>
            </div>
          </Link>
        ))}
      </section>
      <section className="benefits-section" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading">Por que escolher o <span className="text-accent">Connect2Work</span>?</h2>
        <div className="benefits-grid">
          <article className="benefit-card"><div className="benefit-icon" aria-hidden="true">◷</div><h3>Flexibilidade</h3><p>Reserve por hora, sem contratos longos ou burocracia</p></article>
          <article className="benefit-card"><div className="benefit-icon" aria-hidden="true">ϟ</div><h3>Infraestrutura</h3><p>Wi-Fi de alta velocidade, ar condicionado e equipamentos modernos</p></article>
          <article className="benefit-card"><div className="benefit-icon" aria-hidden="true">◎</div><h3>Networking</h3><p>Ambiente profissional para expandir sua rede de contatos</p></article>
        </div>
      </section>
    </main>
  );
}
