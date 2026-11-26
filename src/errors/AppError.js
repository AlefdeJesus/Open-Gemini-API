export class AppError extends Error {
  constructor(message, status = 500, codigo = 'INTERNAL_SERVER_ERROR', detalhes = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.codigo = codigo;
    if (detalhes !== null && detalhes !== undefined) {
      this.detalhes = detalhes;
    }
  }
}

export default AppError;
