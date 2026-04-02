import { Link } from 'react-router-dom';

const guestSteps = [
  {
    badge: '01',
    title: 'Join',
    body: 'Join with Google or Microsoft. No lengthy forms—just get in.',
    to: '/join',
  },
  {
    badge: '02',
    title: 'Create your Showcase',
    body: 'Upload work samples, add links, and highlight what you want people to see first.',
    to: '/join',
  },
  {
    badge: '03',
    title: 'Discover and Connect',
    body: 'Find and connect with people who share your industries, skills, hobbies, and interests.',
    to: '/directory',
  },
  {
    badge: '04',
    title: 'Show up',
    body: 'Participate: post, comment, and build real professional connections.',
    to: '/feed',
  },
];

const memberSteps = [
  {
    badge: '01',
    title: 'Profile',
    body: 'View and edit your profile, portfolio, and how you show up.',
    to: '/dashboard',
  },
  {
    badge: '02',
    title: 'Settings',
    body: 'Update your intent, values, and account preferences.',
    to: '/dashboard/settings',
  },
  {
    badge: '03',
    title: 'Follow people',
    body: 'Discover and follow others who share your values and goals.',
    to: '/directory',
  },
  {
    badge: '04',
    title: 'Show up',
    body: 'Participate: post, comment, and build real professional connections.',
    to: '/feed',
  },
];

export type HowItWorksProps = {
  /** When true, step links skip /join and point at the app (signed-in Members). */
  memberSignedIn?: boolean;
};

export const HowItWorks = ({ memberSignedIn = false }: HowItWorksProps) => {
  const steps = memberSignedIn ? memberSteps : guestSteps;
  return (
    <section
      className="home-landing__section home-landing__section--alt"
      aria-labelledby="how-it-works-heading"
    >
      <div className="home-landing__container">
        <h2 id="how-it-works-heading" className="home-landing__section-title">
          How It Works
        </h2>
        <div className="home-landing__grid home-landing__grid--four">
          {steps.map(({ badge, title, body, to }) => (
            <Link className="home-landing__step" to={to} key={title}>
              <span className="home-landing__step-badge" aria-hidden="true">
                {badge}
              </span>
              <h3 className="home-landing__step-title">{title}</h3>
              <p className="home-landing__step-body">{body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
