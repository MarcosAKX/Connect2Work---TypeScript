import { Link, type To } from 'react-router-dom';
import { ArrowLeftIcon } from './icons';

export function BackLink({ to, label = 'Voltar' }: { to: To; label?: string }) {
  return <Link to={to} className="page-back"><ArrowLeftIcon width="16" height="16" />{label}</Link>;
}
