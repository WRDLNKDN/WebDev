import { PAY_PATH } from '../../lib/marketing/payLink';

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

/** Donate / pay CTA: same-origin path; production redirects to GoDaddy Pay Link (see `vercel.json`). */
export const FOOTER_DONATE_URL = PAY_PATH;

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
