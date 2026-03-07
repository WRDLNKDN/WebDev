export type AdvertiseFieldErrors = {
  name?: string;
  email?: string;
  destinationUrl?: string;
  message?: string;
  adCopyDescription?: string;
  icon?: string;
};

export const isValidAdvertiserDestinationUrl = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateAdvertiseFields = ({
  name,
  email,
  destinationUrl,
  message,
  adCopyDescription,
  iconFile,
}: {
  name: string;
  email: string;
  destinationUrl: string;
  message: string;
  adCopyDescription: string;
  iconFile: File | null;
}): AdvertiseFieldErrors => {
  const errors: AdvertiseFieldErrors = {};

  if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!isValidAdvertiserDestinationUrl(destinationUrl)) {
    errors.destinationUrl = 'Enter a valid https:// destination URL.';
  }

  if (message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }

  if (adCopyDescription.trim().length < 10) {
    errors.adCopyDescription =
      'Ad Copy Description must be at least 10 characters.';
  }

  if (!iconFile) {
    errors.icon = 'Icon/logo file is required.';
  }

  return errors;
};
