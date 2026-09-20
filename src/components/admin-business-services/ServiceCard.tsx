import { ImageIcon, PencilIcon } from '../icons';
import type { BusinessService } from '../../types/domain';

interface ServiceCardProps {
  item: BusinessService;
  onEdit(item: BusinessService): void;
}

export function ServiceCard({ item, onEdit }: ServiceCardProps) {
  return (
    <article className={!item.active ? 'is-inactive' : ''}>
      <div className="admin-services-card__media">
        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <ImageIcon width="30" height="30" />}
      </div>
      <div className="admin-services-card__body">
        <div>
          <span>{item.active ? 'Ativo' : 'Inativo'}</span>
          <h2>{item.name}</h2>
          <p>{item.description}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => onEdit(item)}>
          <PencilIcon width="17" height="17" />Editar
        </button>
      </div>
    </article>
  );
}
