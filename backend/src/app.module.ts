import { AgendamentosModule, type AgendamentosDependencies } from './modules/agendamentos.module';
import { AgendamentosAdministrativosModule, type AgendamentosAdministrativosDependencies } from './modules/agendamentos-administrativos.module';
import { Module, type DynamicModule } from '@nestjs/common';
import { AuthModule, type CadastroDependencies } from './modules/auth.module';
import { HealthModule } from './modules/health.module';
import type { Readiness } from './database/database.service';
import { CatalogoModule, type CatalogoDependencies } from './modules/catalogo.module';
import { AdministracaoModule, type AdministracaoDependencies } from './modules/administracao.module';
@Module({})
export class AppModule {
  static register(database: Readiness, cadastro?: CadastroDependencies, catalogo?: CatalogoDependencies, admin?: AdministracaoDependencies, bookings?: AgendamentosAdministrativosDependencies, clientBookings?: AgendamentosDependencies): DynamicModule {
    return { module: AppModule, imports: [HealthModule.register(database), ...(cadastro ? [AuthModule.register(cadastro)] : []), ...(catalogo ? [CatalogoModule.register(catalogo)] : []), ...(admin ? [AdministracaoModule.register(admin)] : []), ...(bookings ? [AgendamentosAdministrativosModule.register(bookings)] : []), ...(clientBookings ? [AgendamentosModule.register(clientBookings)] : [])] };
  }
}
