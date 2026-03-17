/**
 * Export Directory connections to CSV for download.
 */
import type { DirectoryMember } from '../api/directoryApi';
import { getProfileLink } from './profileLink';

function escapeCsvField(value: string | null | undefined): string {
  const s = value == null ? '' : String(value).trim();
  if (
    s.includes('"') ||
    s.includes(',') ||
    s.includes('\n') ||
    s.includes('\r')
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV string from connected members. Optional origin for absolute profile URLs.
 */
export function buildConnectionsCsv(
  members: DirectoryMember[],
  origin?: string,
): string {
  const header =
    'Display Name,Handle,Tagline,Pronouns,Industry,Secondary Industry,Location,Skills,Profile URL';
  const rows = members.map((m) => {
    const profilePath = getProfileLink(m);
    const profileUrl = origin
      ? `${origin.replace(/\/$/, '')}${profilePath}`
      : profilePath;
    const skills = Array.isArray(m.skills) ? m.skills.join('; ') : '';
    return [
      escapeCsvField(m.display_name ?? ''),
      escapeCsvField(m.handle ?? ''),
      escapeCsvField(m.tagline ?? ''),
      escapeCsvField(m.pronouns ?? ''),
      escapeCsvField(m.industry ?? ''),
      escapeCsvField(m.secondary_industry ?? ''),
      escapeCsvField(m.location ?? ''),
      escapeCsvField(skills),
      escapeCsvField(profileUrl),
    ].join(',');
  });
  return [header, ...rows].join('\r\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
