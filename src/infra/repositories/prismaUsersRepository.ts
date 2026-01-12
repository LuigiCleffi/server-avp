import type { UsersRepository } from '@/application/ports/usersRepository';
import { User, UserRole } from '@/domain/entities/user';
import type { Email } from '@/domain/value-objects/email';
import type { UserRole as PrismaUserRole } from '@/generated/prisma/client';
import { prisma } from '../prisma/client';

function toDomainUserRole(role: PrismaUserRole): UserRole {
  switch (role) {
    case 'USER':
      return UserRole.USER;
    case 'ADMIN':
      return UserRole.ADMIN;
  }
}

function toPrismaUserRole(role: UserRole): PrismaUserRole {
  switch (role) {
    case UserRole.USER:
      return 'USER';
    case UserRole.ADMIN:
      return 'ADMIN';
  }
}

export class PrismaUsersRepository implements UsersRepository {
  async findById(id: string): Promise<User | null> {
    const record = await prisma.user.findUnique({ where: { id } });
    if (!record) return null;

    return User.restore({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.password,
      role: toDomainUserRole(record.role),
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
      role: toDomainUserRole(record.role),
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
        role: toPrismaUserRole(primitives.role),
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
        role: toPrismaUserRole(primitives.role),
      },
    });
  }
}
