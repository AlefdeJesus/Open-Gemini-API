import { AppError } from '../errors/AppError.js';

export function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requireNonEmptyString(value, message, codigo) {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    throw new AppError(message, 400, codigo);
  }
  return normalized;
}

export function wantsBinaryStream(req, mimePrefix) {
  return (
    req.query?.stream === 'true' ||
    req.query?.download === 'true' ||
    req.body?.stream === true ||
    Boolean(mimePrefix && req.headers?.accept?.includes(mimePrefix))
  );
}
