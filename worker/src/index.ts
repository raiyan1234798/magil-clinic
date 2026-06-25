import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { buildHonoApi } from './hono-api';

export interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
  JWT_SECRET?: string;
}

let cachedApp: ReturnType<typeof buildHonoApi> | null = null;

function getApp(env: Env) {
  if (!cachedApp) {
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });
    cachedApp = buildHonoApi(prisma, {
      jwtSecret: env.JWT_SECRET,
      corsOrigin: env.CORS_ORIGIN,
    });
  }
  return cachedApp;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return getApp(env).fetch(request, env, ctx);
  },
};
