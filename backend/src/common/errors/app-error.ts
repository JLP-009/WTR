export class AppError extends Error {
  public constructor(public readonly code: string, public readonly statusCode: number, message: string, public readonly details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AppError';
  }
}
