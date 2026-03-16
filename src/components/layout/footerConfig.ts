export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterSection = {
  title: string;
  links: FooterLink[];
};

export type FooterSocialLink = {
  label: string;
  href: string;
};

export const FOOTER_DONATE_URL =
  'https://0ce9348c-39fb-4c78-88f3-cde23f784fad.paylinks.godaddy.com/d43df879-0ba0-4c34-9de0-878';

/** QR code image URL encoding FOOTER_DONATE_URL so it stays in sync when the donate link changes. */
export const FOOTER_DONATE_QR_ASSET = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(FOOTER_DONATE_URL)}`;

export const FOOTER_SOCIAL_LINKS: FooterSocialLink[] = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/wrdlnkdn/',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/wrdlnkdn',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/wrdlnkdn',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@WRDLNKDN',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/WRDLNKDN',
  },
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Advertise', href: '/advertise' },
      { label: 'Community Partners', href: '/community-partners' },
      {
        label: 'Contact',
        href: 'https://github.com/WRDLNKDN/Agreements?tab=readme-ov-file#contact',
        external: true,
      },
    ],
  },
  {
    title: 'Legal Notices',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Community Guidelines', href: '/guidelines' },
    ],
  },
];
