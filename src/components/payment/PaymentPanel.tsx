import { CopyIcon, CreditCardIcon, LockIcon, QrCodeIcon } from '../icons';
import { pixCode, type PaymentViewModel } from '../../hooks/usePayment';
import { DemoQrCode } from './DemoQrCode';

type PaymentPanelProps = Pick<PaymentViewModel,
  'method' | 'card' | 'copyStatus' | 'copyPixCode' | 'updateCard' | 'selectMethod'
>;

export function PaymentPanel({ method, card, copyStatus, copyPixCode, updateCard, selectMethod }: PaymentPanelProps) {
  return (
        <section className="payment-panel card" aria-labelledby="payment-method-heading">
          <fieldset className="payment-method-fieldset">
            <legend id="payment-method-heading">Forma de Pagamento</legend>
            <div className="payment-methods" role="radiogroup" aria-label="Escolha a forma de pagamento">
              <button type="button" role="radio" aria-checked={method === 'pix'} className={`payment-method${method === 'pix' ? ' is-selected' : ''}`} onClick={() => selectMethod('pix')}>
                <span className="payment-method__icon"><QrCodeIcon width="22" height="22" /></span>
                <span><strong>PIX</strong><small>Pagamento instantâneo</small></span>
              </button>
              <button type="button" role="radio" aria-checked={method === 'card'} className={`payment-method${method === 'card' ? ' is-selected' : ''}`} onClick={() => selectMethod('card')}>
                <span className="payment-method__icon"><CreditCardIcon width="22" height="22" /></span>
                <span><strong>Cartão de Crédito/Débito</strong><small>Simulação segura</small></span>
              </button>
            </div>
          </fieldset>

          <div className="payment-panel__divider" />

          {method === 'pix' ? (
            <section className="pix-payment" aria-labelledby="pix-heading">
              <h2 id="pix-heading" className="sr-only">Pagamento por PIX</h2>
              <DemoQrCode />
              <p>Escaneie o QR Code com seu aplicativo de banco.</p>
              <p className="payment-demo-note"><LockIcon width="15" height="15" />Ambiente de teste: nenhum valor será cobrado.</p>
              <label htmlFor="pix-code">Ou copie o código PIX</label>
              <div className="pix-code-row">
                <input id="pix-code" value={pixCode} readOnly onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="copy-button" onClick={copyPixCode} aria-label="Copiar código PIX"><CopyIcon width="18" height="18" /></button>
              </div>
              <p className="copy-status" role="status" aria-live="polite">{copyStatus}</p>
            </section>
          ) : (
            <section className="card-payment" aria-labelledby="card-heading">
              <div className="card-payment__heading"><h2 id="card-heading">Dados do cartão</h2><span><LockIcon width="15" height="15" />Não armazenamos estes dados</span></div>
              <div className="payment-field payment-field--full"><label htmlFor="card-holder">Nome impresso no cartão</label><input id="card-holder" autoComplete="cc-name" value={card.holder} onChange={(event) => updateCard('holder', event.target.value)} placeholder="Nome completo" /></div>
              <div className="payment-field payment-field--full"><label htmlFor="card-number">Número do cartão</label><input id="card-number" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(event) => updateCard('number', event.target.value)} placeholder="0000 0000 0000 0000" maxLength={19} /></div>
              <div className="card-payment__row">
                <div className="payment-field"><label htmlFor="card-expiry">Validade</label><input id="card-expiry" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(event) => updateCard('expiry', event.target.value)} placeholder="MM/AA" maxLength={5} /></div>
                <div className="payment-field"><label htmlFor="card-cvv">CVV</label><input id="card-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(event) => updateCard('cvv', event.target.value)} placeholder="000" maxLength={3} /></div>
              </div>
              <p className="payment-demo-note"><LockIcon width="15" height="15" />Pagamento simulado. Nenhum dado será enviado ou cobrado.</p>
            </section>
          )}
        </section>
  );
}
