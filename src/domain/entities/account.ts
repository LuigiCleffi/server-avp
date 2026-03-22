import { DomainValidationError } from '../errors/domainValidationError';
import { Email } from '../value-objects/email';
import { PasswordHash } from '../value-objects/passwordHash';

export enum AccountType {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
}

export type AccountProps = {
  id: string;
  name: string;
  email: Email;
  passwordHash: PasswordHash;
  accountType: AccountType;
  createdAt: Date;
  updatedAt: Date;
};

export class Account {
  private constructor(private props: AccountProps) {}

  private static validateName(raw: string): string {
    const name = raw.trim();
    if (name.length === 0) {
      throw new DomainValidationError('Name is required');
    }
    return name;
  }

  private static deriveNameFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? '';
    const candidate = localPart.trim();
    if (candidate.length > 0) {
      return candidate;
    }
    return 'account';
  }

  private touch(now: Date): void {
    this.props = {
      ...this.props,
      updatedAt: now,
    };
  }

  public static createNew(params: {
    id: string;
    name?: string;
    email: string;
    passwordHash: string;
    accountType?: AccountType;
    now?: Date;
  }): Account {
    const now = params.now ?? new Date();

    const name = Account.validateName(
      params.name && params.name.trim().length > 0
        ? params.name
        : Account.deriveNameFromEmail(params.email),
    );

    return new Account({
      id: params.id,
      name,
      email: Email.create(params.email),
      passwordHash: PasswordHash.create(params.passwordHash),
      accountType: params.accountType ?? AccountType.PLAYER,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static restore(props: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    accountType: AccountType;
    createdAt: Date;
    updatedAt: Date;
  }): Account {
    return new Account({
      id: props.id,
      name: Account.validateName(props.name),
      email: Email.create(props.email),
      passwordHash: PasswordHash.create(props.passwordHash),
      accountType: props.accountType,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  public get id(): string {
    return this.props.id;
  }

  public changePasswordHash(newPasswordHash: string, now: Date = new Date()): void {
    this.props = {
      ...this.props,
      passwordHash: PasswordHash.create(newPasswordHash),
    };
    this.touch(now);
  }

  public toPrimitives(): {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    accountType: AccountType;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.props.id,
      name: this.props.name,
      email: this.props.email.toString(),
      passwordHash: this.props.passwordHash.toString(),
      accountType: this.props.accountType,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}