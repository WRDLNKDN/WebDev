import { Link } from 'react-router-dom';

const steps = [
  {
    badge: '01',
    title: 'Join',
    body: 'Join with Google or Microsoft. No lengthy forms—just get in.',
    to: '/join',
  },
  {
    badge: '02',
    title: 'Set your intent',
    body: 'Define your values and how you want to show up in the network.',
    to: '/join',
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

export const HowItWorks = () => {
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
