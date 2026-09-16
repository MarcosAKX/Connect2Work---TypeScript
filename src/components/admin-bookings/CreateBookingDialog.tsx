import { useEffect, useRef } from 'react';
import { useCreateBookingForAdmin } from '../../hooks/useCreateBookingForAdmin';

export function CreateBookingDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose(): void;
  onCreated(): Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const form = useCreateBookingForAdmin(open, onCreated);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  async function submit() {
    if (await form.submit()) onClose();
  }
  return (
    <dialog
      ref={ref}
      className="admin-bookings-modal admin-bookings-modal--create"
      aria-labelledby="create-booking-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!form.isSaving) {
          form.reset();
          onClose();
        }
      }}
    >
      <div>
        <h2 id="create-booking-title">Novo Agendamento</h2>
        <p>Crie uma reserva confirmada em nome de um cliente.</p>
        <div className="admin-booking-form">
          <fieldset>
            <legend>Cliente</legend>
            <input
              value={form.clientQuery}
              onChange={(event) => form.setClientQuery(event.target.value)}
              placeholder="Buscar por nome ou e-mail"
              autoComplete="off"
            />
            <div className="admin-booking-client-results">
              {form.clients.map((client) => (
                <label
                  key={client.id}
                  className={form.clientId === client.id ? 'is-selected' : ''}
                >
                  <input
                    type="radio"
                    name="client"
                    value={client.id}
                    checked={form.clientId === client.id}
                    onChange={() => form.setClientId(client.id)}
                  />
                  <span>
                    <strong>{client.name}</strong>
                    <small>{client.email}</small>
                  </span>
                </label>
              ))}
              {!form.isLoading && form.clients.length === 0 && (
                <small>Nenhum cliente ativo encontrado.</small>
              )}
            </div>
          </fieldset>
          {form.selectedClient?.hasHoursPlan && (
            <div
              className={`admin-booking-plan-note${form.planExpired ? ' is-expired' : ''}`}
            >
              <span>
                {form.planExpired
                  ? 'Plano aguardando renovação: será cobrado o valor integral. Renove-o em Planos de Horas.'
                  : form.duration > 0
                    ? `${form.planUsage?.hoursFromPlan ?? 0}h debitadas do plano · ${form.planUsage?.hoursToPay ?? 0}h cobradas à parte.`
                    : `Saldo disponível: ${form.selectedClient.hoursBalance}h.`}
              </span>
            </div>
          )}
          <div className="admin-booking-form__grid">
            <label>
              Unidade
              <select
                value={form.unitId}
                onChange={(event) => form.setUnitId(event.target.value)}
              >
                <option value="">Selecione</option>
                {form.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sala
              <select
                value={form.roomId}
                onChange={(event) => form.setRoomId(event.target.value)}
                disabled={!form.unitId}
              >
                <option value="">Selecione</option>
                {form.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input
                type="date"
                min={new Date().toLocaleDateString('en-CA')}
                value={form.date}
                onChange={(event) => form.setDate(event.target.value)}
              />
            </label>
            <label>
              Início
              <select
                value={form.startTime}
                onChange={(event) => form.setStartTime(event.target.value)}
              >
                <option value="">Selecione</option>
                {form.hours.slice(0, -1).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fim
              <select
                value={form.endTime}
                onChange={(event) => form.setEndTime(event.target.value)}
              >
                <option value="">Selecione</option>
                {form.hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valor (R$)
              <input
                inputMode="decimal"
                value={form.total}
                onChange={(event) => form.setTotal(event.target.value)}
                placeholder="0,00"
              />
            </label>
            <label>
              Pagamento
              <select
                value={form.paymentStatus}
                onChange={(event) =>
                  form.setPaymentStatus(
                    event.target.value === 'completed'
                      ? 'completed'
                      : 'pending',
                  )
                }
              >
                <option value="pending">Pendente</option>
                <option value="completed">Concluído</option>
              </select>
            </label>
          </div>
        </div>
        {form.duration > 0 && (
          <p className="admin-booking-form__summary">
            {form.duration}h reservadas · valor ajustável
          </p>
        )}
        {form.error && (
          <p className="admin-bookings-modal__error" role="alert">
            {form.error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              form.reset();
              onClose();
            }}
            disabled={form.isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void submit()}
            disabled={form.isSaving || form.isLoading}
          >
            {form.isSaving ? 'Salvando…' : 'Criar agendamento'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
