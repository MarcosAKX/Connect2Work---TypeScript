import type { AppServices } from './contracts';
import { createLocalStorageServices } from './local-storage';
import { AuthHttpGateway } from './auth-http';
import { UnidadesHttpGateway } from './unidades-http';
import { SalasHttpGateway } from './salas-http';
import { UsuariosHttpGateway } from './usuarios-http';
import { CatalogoAdminHttpGateway } from './catalogo-admin-http';
import { businessServices } from './mock-business-services';
import type { CheckoutDraft } from '../types/domain';
const unavailable = async (): Promise<never> => { throw new Error('Funcionalidade ainda não integrada à API.'); };
// O modo real não inicializa usuários, credenciais ou dados privados do mock.
export function createAppServices(authApi: boolean, fetcher?: typeof fetch): AppServices {
  if (!authApi) return createLocalStorageServices();
  let draft: CheckoutDraft | null = null;
  const auth = new AuthHttpGateway(fetcher);
  const unidades = new UnidadesHttpGateway(fetcher, () => auth.checkCurrentSession());
  const salas = new SalasHttpGateway(fetcher, () => auth.checkCurrentSession());
  const usuarios = new UsuariosHttpGateway(fetcher, () => auth.checkCurrentSession());
  const adminCatalog = new CatalogoAdminHttpGateway(fetcher, () => auth.checkCurrentSession());
  return {
    auth,
    adminCatalog, images: adminCatalog,
    users: { listUsers: unavailable, listUsersWithHoursPlanInfo: unavailable, listUsersPage: query => usuarios.listUsersPage(query),
      createUser: input => usuarios.createUser(input), updateUser: (id, input, version) => usuarios.updateUser(id, input, version),
      updateUserRole: (id, role, version) => usuarios.updateUserRole(id, role, version), updateUserStatus: (id, active, version) => usuarios.updateUserStatus(id, active, version),
      searchClients: unavailable, updateUserHoursPlan: unavailable, confirmHoursPlanRenewal: unavailable },
    catalog: {
      getUnits: () => unidades.getUnits(),
      getUnitById: id => unidades.getUnitById(id),
      getRoomsByUnitId: id => salas.getRoomsByUnitId(id),
      getRoomById: id => salas.getRoomById(id),
      createUnit: unavailable, updateUnit: unavailable, deleteUnit: unavailable, createRoom: unavailable, updateRoom: unavailable, deleteRoom: unavailable
    },
    bookings: { getByUserAndStatus: unavailable, getCounts: unavailable, getAll: unavailable, create: unavailable, cancel: unavailable, confirmBooking: unavailable,
      confirmPayment: unavailable, checkInBooking: unavailable, cancelBookingAsAdmin: unavailable },
    checkout: { getDraft() { return draft ? structuredClone(draft) : null; }, saveDraft(value) { draft = structuredClone(value); }, clearDraft() { draft = null; } },
    tasks: { listTasks: unavailable, createTask: unavailable, updateTask: unavailable, updateTaskStatus: unavailable, deleteTask: unavailable },
    businessServices: {
      async listServices(options) { if (options?.includeInactive) return unavailable(); return structuredClone(businessServices.filter(service => service.active)); },
      createService: unavailable, updateService: unavailable, deleteService: unavailable
    },
    audit: { listRecent: unavailable, listHoursPlanTransactions: unavailable },
    backup: { exportData: unavailable, importData: unavailable, getLastBackupAt: unavailable }
  };
}
