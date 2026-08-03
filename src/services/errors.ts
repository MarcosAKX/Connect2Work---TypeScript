export class DomainError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) { super(message, 'NOT_FOUND'); }
}

export class ConflictError extends DomainError {
  constructor(message: string) { super(message, 'CONFLICT'); }
}

export class PermissionError extends DomainError {
  constructor(message: string) { super(message, 'PERMISSION_DENIED'); }
}

export class ValidationError extends DomainError {
  constructor(message: string) { super(message, 'VALIDATION_ERROR'); }
}
