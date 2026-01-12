import { DomainValidationError } from '@/domain/errors/domainValidationError';

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SWISS = 'SWISS',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

export type TournamentProps = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  fee: string;
  prizePool: string;
  format: TournamentFormat;
  maxParticipants: number;
  status: TournamentStatus;
  organizerUserId: string;
  gameId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TournamentPrimitives = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  fee: string;
  prizePool: string;
  format: TournamentFormat;
  maxParticipants: number;
  status: TournamentStatus;
  organizerUserId: string;
  gameId: string;
  createdAt: string;
  updatedAt: string;
};

function validateMoney(raw: string, fieldName: string): string {
  const value = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new DomainValidationError(`${fieldName} must be a valid decimal amount`);
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new DomainValidationError(`${fieldName} must be >= 0`);
  }

  return value;
}

function validateUuid(raw: string, fieldName: string): string {
  const value = raw.trim();
  const uuidV4ish =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidV4ish.test(value)) {
    throw new DomainValidationError(`${fieldName} must be a valid UUID`);
  }

  return value;
}

export class Tournament {
  private constructor(private props: TournamentProps) {}

  private static validateName(raw: string): string {
    const name = raw.trim();
    if (name.length === 0) {
      throw new DomainValidationError('Name is required');
    }
    return name;
  }

  private static validateDates(startDate: Date, endDate: Date | null): void {
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
      throw new DomainValidationError('startDate is required');
    }

    if (endDate) {
      if (Number.isNaN(endDate.getTime())) {
        throw new DomainValidationError('endDate must be a valid date');
      }

      if (endDate.getTime() < startDate.getTime()) {
        throw new DomainValidationError('endDate must be >= startDate');
      }
    }
  }

  private static validateMaxParticipants(value: number): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new DomainValidationError('maxParticipants must be a positive integer');
    }
    return value;
  }

  private touch(now: Date): void {
    this.props = { ...this.props, updatedAt: now };
  }

  public static restore(props: Omit<TournamentProps, 'name' | 'fee' | 'prizePool'> & {
    name: string;
    fee: string;
    prizePool: string;
  }): Tournament {
    const name = Tournament.validateName(props.name);
    Tournament.validateDates(props.startDate, props.endDate);

    return new Tournament({
      ...props,
      name,
      fee: validateMoney(props.fee, 'fee'),
      prizePool: validateMoney(props.prizePool, 'prizePool'),
      maxParticipants: Tournament.validateMaxParticipants(props.maxParticipants),
    });
  }

  public static createNew(params: {
    id: string;
    name: string;
    description?: string | null;
    startDate: Date;
    endDate?: Date | null;
    fee: string;
    prizePool: string;
    format: TournamentFormat;
    maxParticipants: number;
    status?: TournamentStatus;
    organizerUserId: string;
    gameId: string;
    now?: Date;
  }): Tournament {
    const now = params.now ?? new Date();

    const name = Tournament.validateName(params.name);
    const description = params.description ?? null;
    const endDate = params.endDate ?? null;

    Tournament.validateDates(params.startDate, endDate);

    return new Tournament({
      id: params.id,
      name,
      description,
      startDate: params.startDate,
      endDate,
      fee: validateMoney(params.fee, 'fee'),
      prizePool: validateMoney(params.prizePool, 'prizePool'),
      format: params.format,
      maxParticipants: Tournament.validateMaxParticipants(params.maxParticipants),
      status: params.status ?? TournamentStatus.DRAFT,
      organizerUserId: validateUuid(params.organizerUserId, 'organizerUserId'),
      gameId: validateUuid(params.gameId, 'gameId'),
      createdAt: now,
      updatedAt: now,
    });
  }

  public get id(): string {
    return this.props.id;
  }

  public get status(): TournamentStatus {
    return this.props.status;
  }

  public schedule(now: Date = new Date()): void {
    const allowed: TournamentStatus[] = [TournamentStatus.DRAFT, TournamentStatus.PENDING_APPROVAL];
    if (!allowed.includes(this.props.status)) {
      throw new DomainValidationError('Invalid status transition');
    }

    this.props = { ...this.props, status: TournamentStatus.SCHEDULED };
    this.touch(now);
  }

  public requestApproval(now: Date = new Date()): void {
    if (this.props.status !== TournamentStatus.DRAFT) {
      throw new DomainValidationError('Invalid status transition');
    }

    this.props = { ...this.props, status: TournamentStatus.PENDING_APPROVAL };
    this.touch(now);
  }

  public start(now: Date = new Date()): void {
    if (this.props.status !== TournamentStatus.SCHEDULED) {
      throw new DomainValidationError('Invalid status transition');
    }

    this.props = { ...this.props, status: TournamentStatus.RUNNING };
    this.touch(now);
  }

  public complete(now: Date = new Date()): void {
    if (this.props.status !== TournamentStatus.RUNNING) {
      throw new DomainValidationError('Invalid status transition');
    }

    this.props = { ...this.props, status: TournamentStatus.COMPLETED };
    this.touch(now);
  }

  public cancel(now: Date = new Date()): void {
    const allowed: TournamentStatus[] = [TournamentStatus.DRAFT, TournamentStatus.SCHEDULED, TournamentStatus.PENDING_APPROVAL];
    if (!allowed.includes(this.props.status)) {
      throw new DomainValidationError('Invalid status transition');
    }

    this.props = { ...this.props, status: TournamentStatus.CANCELED };
    this.touch(now);
  }

  public toPrimitives(): TournamentPrimitives {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      startDate: this.props.startDate.toISOString(),
      endDate: this.props.endDate ? this.props.endDate.toISOString() : null,
      fee: this.props.fee,
      prizePool: this.props.prizePool,
      format: this.props.format,
      maxParticipants: this.props.maxParticipants,
      status: this.props.status,
      organizerUserId: this.props.organizerUserId,
      gameId: this.props.gameId,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
