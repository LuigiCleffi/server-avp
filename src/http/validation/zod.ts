import type { FastifyRequest } from 'fastify';
import type { ZodTypeAny } from 'zod';
import type { z } from 'zod';

export function parseBody<TSchema extends ZodTypeAny>(
  req: FastifyRequest,
  schema: TSchema,
): z.infer<TSchema> {
  return schema.parse(req.body) as z.infer<TSchema>;
}

export function parseParams<TSchema extends ZodTypeAny>(
  req: FastifyRequest,
  schema: TSchema,
): z.infer<TSchema> {
  return schema.parse(req.params) as z.infer<TSchema>;
}

export function parseQuery<TSchema extends ZodTypeAny>(
  req: FastifyRequest,
  schema: TSchema,
): z.infer<TSchema> {
  return schema.parse(req.query) as z.infer<TSchema>;
}
