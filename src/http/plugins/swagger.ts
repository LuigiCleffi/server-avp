import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { env } from '@/env';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

type OpenApiSchema = {
  example?: JsonValue;
};

type OpenApiMediaType = {
  schema?: OpenApiSchema;
  example?: JsonValue;
};

type OpenApiRequestBody = {
  content?: {
    'application/json'?: OpenApiMediaType;
  };
};

type OpenApiOperation = {
  requestBody?: OpenApiRequestBody;
};

type OpenApiPathItem = {
  [method: string]: OpenApiOperation | object | undefined;
};

type OpenApiDocument = {
  paths?: {
    [path: string]: OpenApiPathItem | undefined;
  };
};

function promoteJsonSchemaExamplesToMediaExamples(openapiObject: OpenApiDocument): void {
  const paths = openapiObject.paths ?? {};

  for (const pathItem of Object.values(paths)) {
    if (!pathItem) continue;

    for (const op of Object.values(pathItem)) {
      if (!op || typeof op !== 'object' || !('requestBody' in op)) continue;

      const operation = op as OpenApiOperation;
      const requestBody = operation.requestBody;
      const json = requestBody?.content?.['application/json'];
      if (!json) continue;

      const schemaExample = json.schema?.example;
      if (json.example === undefined && schemaExample !== undefined) {
        json.example = schemaExample;
      }
    }
  }
}

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'eTourneys API',
        description: 'API documentation for the eTourneys backend.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Service health and readiness checks' },
        { name: 'Auth', description: 'Authentication and user identity' },
        { name: 'Tournaments', description: 'Tournament browsing and management' },
      ],
    },
    transformObject(input) {
      if ('openapiObject' in input) {
        const openapiObject = input.openapiObject as OpenApiDocument;
        promoteJsonSchemaExamplesToMediaExamples(openapiObject);
        return openapiObject;
      }

      // When configured for Swagger v2 output, leave the object untouched.
      return input.swaggerObject;
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  app.log.info(
    {
      event: 'openapi.ready',
      docs: `http://${env.host}:${env.port}/docs`,
      spec: `http://${env.host}:${env.port}/docs/json`,
    },
    'Swagger docs available',
  );
}
