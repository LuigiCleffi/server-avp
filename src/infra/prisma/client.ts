import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { dbPool } from '@/infra/db/pool';

const adapter = new PrismaPg(dbPool);

export const prisma = new PrismaClient({ adapter });
