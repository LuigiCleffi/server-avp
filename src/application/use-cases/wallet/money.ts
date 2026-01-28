import { DomainError } from '@/shared/errors/appErrors';

export function moneyToMinorUnits(amount: string, decimals = 2): number {
  const normalized = amount.trim();
  const re = new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`);
  if (!re.test(normalized)) {
    throw new DomainError('Invalid amount format', { amount });
  }

  const [whole, fracRaw = ''] = normalized.split('.');
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);

  // NOTE: For MVP we assume values fit in JS number range.
  const minor = Number(whole) * 10 ** decimals + Number(frac);
  if (!Number.isFinite(minor) || minor < 0) {
    throw new DomainError('Amount must be >= 0', { amount });
  }

  return minor;
}

export function amountToMinorUnits(amount: string, decimals = 2): number {
  const minor = moneyToMinorUnits(amount, decimals);
  if (minor <= 0) {
    throw new DomainError('Amount must be positive', { amount });
  }
  return minor;
}
