export type AccountMeta = {
  createdAt: string | null;
  lastLogin: string | null;
  displayName: string | null;
  nameChangedAt: number | null;
};

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const time = (value: string | null | undefined) => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

export function formatDate(value: string | null | undefined) {
  const parsed = time(value);
  return parsed === null ? 'Unknown' : day.format(parsed);
}

export function formatDateTime(value: string | null | undefined) {
  const parsed = time(value);
  return parsed === null ? 'Unknown' : dayTime.format(parsed);
}
