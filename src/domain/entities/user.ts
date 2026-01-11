import { DomainValidationError } from '../errors/domainValidationError';
import { Email } from '../value-objects/email';
import { PasswordHash } from '../value-objects/passwordHash';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export type UserProps = {
  id: string;
  name: string;
  email: Email;
  passwordHash: PasswordHash;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export class User {
  private constructor(private props: UserProps) {}

  private static validateName(raw: string): string {
    const name = raw.trim();
    if (name.length === 0) {
      throw new DomainValidationError('Name is required');
    }
    return name;
  }

  private touch(now: Date): void {
    this.props = {
      ...this.props,
      updatedAt: now,
    };
  }

  public static createNew(params: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
    now?: Date;
  }): User {
    const now = params.now ?? new Date();

    const name = User.validateName(params.name);

    return new User({
      id: params.id,
      name,
      email: Email.create(params.email),
      passwordHash: PasswordHash.create(params.passwordHash),
      role: params.role ?? UserRole.USER,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static restore(props: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User({
      id: props.id,
      name: User.validateName(props.name),
      email: Email.create(props.email),
      passwordHash: PasswordHash.create(props.passwordHash),
      role: props.role,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  public get id(): string {
    return this.props.id;
  }

  public get role(): UserRole {
    return this.props.role;
  }

  public changeName(newName: string, now: Date = new Date()): void {
    this.props = {
      ...this.props,
      name: User.validateName(newName),
    };
    this.touch(now);
  }

  public changeEmail(newEmail: string, now: Date = new Date()): void {
    this.props = {
      ...this.props,
      email: Email.create(newEmail),
    };
    this.touch(now);
  }

  public changePasswordHash(newPasswordHash: string, now: Date = new Date()): void {
    this.props = {
      ...this.props,
      passwordHash: PasswordHash.create(newPasswordHash),
    };
    this.touch(now);
  }

  public promoteToAdmin(now: Date = new Date()): void {
    if (this.props.role === UserRole.ADMIN) return;
    this.props = {
      ...this.props,
      role: UserRole.ADMIN,
    };
    this.touch(now);
  }

  public demoteToUser(now: Date = new Date()): void {
    if (this.props.role === UserRole.USER) return;
    this.props = {
      ...this.props,
      role: UserRole.USER,
    };
    this.touch(now);
  }

  public toPrimitives(): {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.props.id,
      name: this.props.name,
      email: this.props.email.toString(),
      passwordHash: this.props.passwordHash.toString(),
      role: this.props.role,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
