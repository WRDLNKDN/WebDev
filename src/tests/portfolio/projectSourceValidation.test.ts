import { describe, expect, it } from 'vitest';
import {
  assertCanAddProjectSource,
  assertCanUpdateProjectSource,
  PROJECT_SOURCE_MUTEX_ERROR,
  PROJECT_SOURCE_REQUIRED_ERROR,
  PROJECT_URL_EXTERNAL_REQUIRED_ERROR,
} from '../../lib/portfolio/projectSourceValidation';

describe('projectSourceValidation', () => {
  it('rejects add when both file and URL are present', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    expect(() =>
      assertCanAddProjectSource({
        projectUrlTrimmed: 'https://example.com/x',
        sourceFile: file,
      }),
    ).toThrow(PROJECT_SOURCE_MUTEX_ERROR);
  });

  it('rejects add when neither file nor URL', () => {
    expect(() =>
      assertCanAddProjectSource({
        projectUrlTrimmed: '',
        sourceFile: undefined,
      }),
    ).toThrow(PROJECT_SOURCE_REQUIRED_ERROR);
  });

  it('treats whitespace-only URL as empty', () => {
    expect(() =>
      assertCanAddProjectSource({
        projectUrlTrimmed: '   ',
        sourceFile: undefined,
      }),
    ).toThrow(PROJECT_SOURCE_REQUIRED_ERROR);
  });

  it('allows add with external URL only', () => {
    expect(() =>
      assertCanAddProjectSource({
        projectUrlTrimmed: 'https://example.com/doc.pdf',
        sourceFile: undefined,
      }),
    ).not.toThrow();
  });

  it('rejects add with non-http URL', () => {
    expect(() =>
      assertCanAddProjectSource({
        projectUrlTrimmed: 'ftp://example.com/x',
        sourceFile: undefined,
      }),
    ).toThrow(PROJECT_URL_EXTERNAL_REQUIRED_ERROR);
  });

  it('allows add with file only', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    expect(() =>
      assertCanAddProjectSource({
        projectUrlTrimmed: '',
        sourceFile: file,
      }),
    ).not.toThrow();
  });

  it('allows update with existing storage URL and no new file', () => {
    expect(() =>
      assertCanUpdateProjectSource({
        projectUrlTrimmed:
          'https://cdn.test/storage/v1/object/public/project-sources/u/a/original.png',
        sourceFile: undefined,
        hasExistingStorageUrl: true,
      }),
    ).not.toThrow();
  });

  it('allows update with existing storage source even when URL field is empty', () => {
    expect(() =>
      assertCanUpdateProjectSource({
        projectUrlTrimmed: '',
        sourceFile: undefined,
        hasExistingStorageUrl: true,
      }),
    ).not.toThrow();
  });

  it('rejects update when no URL, no file, and no stored source', () => {
    expect(() =>
      assertCanUpdateProjectSource({
        projectUrlTrimmed: '',
        sourceFile: undefined,
        hasExistingStorageUrl: false,
      }),
    ).toThrow(PROJECT_SOURCE_REQUIRED_ERROR);
  });

  it('rejects update when both new file and URL populated', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(() =>
      assertCanUpdateProjectSource({
        projectUrlTrimmed: 'https://example.com/x.pdf',
        sourceFile: file,
        hasExistingStorageUrl: false,
      }),
    ).toThrow(PROJECT_SOURCE_MUTEX_ERROR);
  });
});
