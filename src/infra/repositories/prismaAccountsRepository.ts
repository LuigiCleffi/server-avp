import type { AccountsRepository } from '@/application/ports/accountsRepository';
import { Account, AccountType } from '@/domain/entities/account';
import type { Email } from '@/domain/value-objects/email';
import { AccountRole as PrismaAccountRole } from '@/generated/prisma/client';
import { prisma } from '../prisma/client';

function toDomainAccountType(role: string): AccountType {
  switch (role) {
    case 'USER':
      return AccountType.PLAYER;
    case 'ADMIN':
      return AccountType.ADMIN;
    case 'GAME_CREATOR':
      return AccountType.ORGANIZER;
    default:
      return AccountType.PLAYER;
  }
}

function toPrismaAccountRole(accountType: AccountType): PrismaAccountRole {
  switch (accountType) {
    case AccountType.PLAYER:
      return 'USER';
    case AccountType.ADMIN:
      return 'ADMIN';
    case AccountType.ORGANIZER:
      return 'GAME_CREATOR';
  }
}

export class PrismaAccountsRepository implements AccountsRepository {
  async findById(id: string): Promise<Account | null> {
    const record = await prisma.account.findUnique({ where: { id } });
    if (!record) return null;

    return Account.restore({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.password,
      accountType: toDomainAccountType(record.role),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findByEmail(email: Email): Promise<Account | null> {
    const record = await prisma.account.findUnique({ where: { email: email.toString() } });
    if (!record) return null;

    return Account.restore({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.password,
      accountType: toDomainAccountType(record.role),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async create(account: Account): Promise<void> {
    const primitives = account.toPrimitives();

    await prisma.account.create({
      data: {
        id: primitives.id,
        name: primitives.name,
        email: primitives.email,
        password: primitives.passwordHash,
        role: toPrismaAccountRole(primitives.accountType),
      },
    });
  }

  async save(account: Account): Promise<void> {
    const primitives = account.toPrimitives();

    await prisma.account.update({
      where: { id: primitives.id },
      data: {
        name: primitives.name,
        email: primitives.email,
        password: primitives.passwordHash,
        role: toPrismaAccountRole(primitives.accountType),
      },
    });
  }
}