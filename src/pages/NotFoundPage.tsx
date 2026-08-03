import { Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import '../assets/css/pages/system-pages.css';

export function NotFoundPage() {
  const { user } = useAuth();
  const destination = user?.role === 'admin' ? '/admin' : user?.role === 'secretaria' ? '/admin/painel-do-dia' : user ? '/unidades' : '/login';
  return <main className="system-page"><div><span>Erro 404</span><h1>Página não encontrada.</h1><p>O endereço pode ter mudado ou não existir.</p><Link to={destination}>Voltar para o início</Link></div></main>;
}
