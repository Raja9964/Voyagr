import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.ts';

interface HttpLikeError {
  status: number;
  expose: boolean;
  message: string;
  type?: string;
}

// body-parser and friends throw http-errors with `status` and `expose` set.
const isHttpLikeError = (error: unknown): error is HttpLikeError =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number' &&
  'expose' in error &&
  error.expose === true;

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'not_found', message: `Route ${req.method} ${req.path} not found` },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Request validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (isHttpLikeError(error)) {
    const message = error.type === 'entity.parse.failed' ? 'Malformed JSON body' : error.message;
    res.status(error.status).json({ error: { code: 'bad_request', message } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
};
