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
  'https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f';

export const FOOTER_DONATE_QR_ASSET = '/assets/donate-qr.png';

export const FOOTER_SOCIAL_LINKS: FooterSocialLink[] = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/wrdlnkdn/',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/wrdlnkdn',
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
    title: 'Documentation',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Community Guidelines', href: '/guidelines' },
    ],
  },
];
