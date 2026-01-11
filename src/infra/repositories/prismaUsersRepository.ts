import type { UsersRepository } from '@/application/ports/usersRepository';
import { User, UserRole } from '@/domain/entities/user';
import type { Email } from '@/domain/value-objects/email';
import { prisma } from '../prisma/client';

export class PrismaUsersRepository implements UsersRepository {
  async findById(id: string): Promise<User | null> {
    const record = await prisma.user.findUnique({ where: { id } });
    if (!record) return null;

    return User.restore({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.password,
      role: record.role as unknown as UserRole,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await prisma.user.findUnique({ where: { email: email.toString() } });
    if (!record) return null;

    return User.restore({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.password,
      role: record.role as unknown as UserRole,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async create(user: User): Promise<void> {
    const primitives = user.toPrimitives();

    await prisma.user.create({
      data: {
        id: primitives.id,
        name: primitives.name,
        email: primitives.email,
        password: primitives.passwordHash,
        role: primitives.role,
      },
    });
  }

  async save(user: User): Promise<void> {
    const primitives = user.toPrimitives();

    await prisma.user.update({
      where: { id: primitives.id },
      data: {
        name: primitives.name,
        email: primitives.email,
        password: primitives.passwordHash,
        role: primitives.role,
      },
    });
  }
}
