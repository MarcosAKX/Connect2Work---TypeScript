import { EyeIcon } from '../icons';
import type { RegisterForm } from '../../hooks/useRegister';

interface FormFieldProps {
  label: string;
  name: keyof RegisterForm;
  value: string;
  onChange(field: keyof RegisterForm, value: string): void;
  type?: string;
  autoComplete: string;
  placeholder: string;
  maxLength?: number;
  inputMode?: 'numeric';
  toggle?: { shown: boolean; change(value: boolean): void; label: string };
}

export function RegisterFormField({ label, name, value, onChange, type = 'text', autoComplete, placeholder, maxLength, inputMode, toggle }: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="field-input-wrap">
        <input id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} value={value} onChange={(event) => onChange(name, event.target.value)} required />
        {toggle && <button type="button" className="toggle-visibility" onClick={() => toggle.change(!toggle.shown)} aria-label={`${toggle.shown ? 'Ocultar' : 'Mostrar'} ${toggle.label}`}><EyeIcon width="18" height="18" hidden={toggle.shown} /></button>}
      </div>
    </div>
  );
}
