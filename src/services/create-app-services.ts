import type { AppServices } from './contracts';
import { createLocalStorageServices } from './local-storage';
import { AuthHttpGateway } from './auth-http';
import { UnidadesHttpGateway } from './unidades-http';
import { businessServices } from './mock-business-services';
import type { CheckoutDraft } from '../types/domain';
const unavailable = async (): Promise<never> => { throw new Error('Funcionalidade ainda não integrada à API.'); };
// O modo real não inicializa usuários, credenciais ou dados privados do mock.
export function createAppServices(authApi: boolean, fetcher?: typeof fetch): AppServices {
  if (!authApi) return createLocalStorageServices();
  let draft: CheckoutDraft | null = null;
  const auth = new AuthHttpGateway(fetcher);
  const unidades = new UnidadesHttpGateway(fetcher, () => auth.checkCurrentSession());
  return {
    auth,
    users: { listUsers: unavailable, listUsersWithHoursPlanInfo: unavailable, createUser: unavailable, updateUser: unavailable,
      updateUserRole: unavailable, updateUserStatus: unavailable, searchClients: unavailable, updateUserHoursPlan: unavailable, confirmHoursPlanRenewal: unavailable },
    catalog: {
      getUnits: () => unidades.getUnits(),
      getUnitById: id => unidades.getUnitById(id),
      getRoomsByUnitId: unavailable,
      getRoomById: unavailable,
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
