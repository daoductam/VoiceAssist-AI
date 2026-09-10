export class AppException extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppException';
    Object.setPrototypeOf(this, AppException.prototype);
  }
}

export class ValidationException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationException';
  }
}

export class NotFoundException extends AppException {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} với mã ${id} không tồn tại.`);
    this.name = 'NotFoundException';
  }
}

export class AiServiceException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AI_SERVICE_ERROR', message, details);
    this.name = 'AiServiceException';
  }
}
