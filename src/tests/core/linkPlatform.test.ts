import { describe, expect, it } from 'vitest';
import { getCategoryForPlatform } from '../../constants/platforms';
import { sanitizePortfolioUrlInput } from '../../lib/portfolio/linkValidation';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  normalizeUrlForDedup,
} from '../../lib/utils/linkPlatform';

describe('detectPlatformFromUrl', () => {
  it('detects newly supported domains', () => {
    expect(detectPlatformFromUrl('https://www.tiktok.com/@member')).toBe(
      'TikTok',
    );
    expect(detectPlatformFromUrl('https://www.patreon.com/member')).toBe(
      'Patreon',
    );
    expect(detectPlatformFromUrl('https://calendly.com/member/intro')).toBe(
      'Calendly',
    );
    expect(
      detectPlatformFromUrl('https://store.steampowered.com/app/620'),
    ).toBe('Steam');
    expect(detectPlatformFromUrl('https://member.itch.io/my-game')).toBe(
      'itch.io',
    );
    expect(detectPlatformFromUrl('https://www.dropbox.com/s/abc/file')).toBe(
      'Dropbox',
    );
    expect(
      detectPlatformFromUrl('https://drive.google.com/file/d/abc/view'),
    ).toBe('Google Drive');
    expect(
      detectPlatformFromUrl('https://docs.google.com/document/d/abc/edit'),
    ).toBe('Google Drive');
    expect(detectPlatformFromUrl('https://mega.nz/folder/abc')).toBe('Mega');
    expect(detectPlatformFromUrl('https://1drv.ms/u/s!abc')).toBe('OneDrive');
    expect(detectPlatformFromUrl('https://app.box.com/folder/123')).toBe('Box');
    expect(detectPlatformFromUrl('https://vercel.com/myteam')).toBe('Vercel');
    expect(detectPlatformFromUrl('https://my-app.vercel.app/')).toBe('Vercel');
  });

  it('returns Custom for unrecognized hosts', () => {
    expect(detectPlatformFromUrl('https://example.invalid/member')).toBe(
      'Custom',
    );
  });

  it('normalizes URLs for duplicate detection across common profile variants', () => {
    expect(
      normalizeUrlForDedup(
        'http://www.linkedin.com/in/AprilLorDrake/?trk=public_profile',
      ),
    ).toBe('https://linkedin.com/in/AprilLorDrake');
    expect(normalizeUrlForDedup('linkedin.com/in/AprilLorDrake')).toBe(
      'https://linkedin.com/in/AprilLorDrake',
    );
  });

  it('finds duplicates after normalization', () => {
    expect(
      findDuplicateNormalizedUrl([
        'https://www.linkedin.com/in/AprilLorDrake/',
        'linkedin.com/in/AprilLorDrake?trk=public_profile',
      ]),
    ).toBe('https://linkedin.com/in/AprilLorDrake');
  });

  it('does not flag distinct normalized URLs as duplicates', () => {
    expect(
      findDuplicateNormalizedUrl([
        'https://github.com/AprilLorDrake',
        'https://linkedin.com/in/AprilLorDrake',
      ]),
    ).toBeNull();
  });

  it('maps detected game platforms to Games category', () => {
    expect(getCategoryForPlatform('Steam')).toBe('Games');
    expect(getCategoryForPlatform('itch.io')).toBe('Games');
    expect(getCategoryForPlatform('Web Browser (Playable Web Game)')).toBe(
      'Games',
    );
    expect(getCategoryForPlatform('GitHub')).toBe('Professional');
  });

  it('maps file hosting platforms to Files category', () => {
    expect(getCategoryForPlatform('Box')).toBe('Files');
    expect(getCategoryForPlatform('Dropbox')).toBe('Files');
    expect(getCategoryForPlatform('Google Drive')).toBe('Files');
    expect(getCategoryForPlatform('Mega')).toBe('Files');
    expect(getCategoryForPlatform('OneDrive')).toBe('Files');
  });

  it('detects music service domains', () => {
    expect(detectPlatformFromUrl('https://open.spotify.com/artist/abc')).toBe(
      'Spotify',
    );
    expect(detectPlatformFromUrl('https://soundcloud.com/artist/handle')).toBe(
      'SoundCloud',
    );
    expect(detectPlatformFromUrl('https://bandcamp.com/album/x')).toBe(
      'Bandcamp',
    );
    expect(detectPlatformFromUrl('https://www.pandora.com/artist/x')).toBe(
      'Pandora',
    );
    expect(detectPlatformFromUrl('https://listen.tidal.com/artist/1')).toBe(
      'Tidal',
    );
    expect(
      detectPlatformFromUrl('https://music.apple.com/us/artist/x/123'),
    ).toBe('Apple Music');
    expect(detectPlatformFromUrl('https://music.amazon.com/artists/B001')).toBe(
      'Amazon Music',
    );
  });

  it('maps Vercel to Professional', () => {
    expect(getCategoryForPlatform('Vercel')).toBe('Professional');
  });

  it('maps music platforms to Music category', () => {
    expect(getCategoryForPlatform('Spotify')).toBe('Music');
    expect(getCategoryForPlatform('SoundCloud')).toBe('Music');
    expect(getCategoryForPlatform('Amazon Music')).toBe('Music');
  });

  it('keeps YouTube inferred category as Content when platform value is shared', () => {
    expect(getCategoryForPlatform('YouTube')).toBe('Content');
  });

  it('sanitizes duplicated protocol input for portfolio URLs', () => {
    expect(
      sanitizePortfolioUrlInput('https: https://www.google.com/project'),
    ).toBe('https://www.google.com/project');
    expect(
      sanitizePortfolioUrlInput('https:// https://www.google.com/project'),
    ).toBe('https://www.google.com/project');
  });
});
