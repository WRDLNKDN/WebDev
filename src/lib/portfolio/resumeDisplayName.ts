const GENERIC_RESUME_FILE_RE = /^resume(?:\.[a-z0-9]+)?$/i;

const decodeSafe = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getTrimmedFileName = (fileName: string | null | undefined): string => {
  if (typeof fileName !== 'string') return '';
  return fileName.trim();
};

const getFileNameFromUrl = (url: string | null | undefined): string => {
  if (typeof url !== 'string' || !url.trim()) return '';

  try {
    const parsed = new URL(url);
    const pathName = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    return getTrimmedFileName(decodeSafe(pathName));
  } catch {
    const cleanUrl = url.split('?')[0]?.split('#')[0] ?? '';
    const pathName = cleanUrl.split('/').filter(Boolean).pop() ?? '';
    return getTrimmedFileName(decodeSafe(pathName));
  }
};

const getExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return '';
  return fileName.slice(dotIndex + 1);
};

export const getResumeDisplayName = ({
  fileName,
  url,
}: {
  fileName?: string | null;
  url?: string | null;
}): string => {
  const storedFileName = getTrimmedFileName(fileName);
  if (storedFileName) return storedFileName;

  const fileNameFromUrl = getFileNameFromUrl(url);
  if (fileNameFromUrl && !GENERIC_RESUME_FILE_RE.test(fileNameFromUrl)) {
    return fileNameFromUrl;
  }

  const extension = getExtension(fileNameFromUrl).toLowerCase();
  return extension ? `Resume.${extension}` : 'Resume';
};
