export const SocialProof = () => {
  return (
    <section
      className="home-landing__section home-landing__section--base"
      aria-labelledby="social-proof-heading"
    >
      <div className="home-landing__container">
        <h2 id="social-proof-heading" className="home-landing__section-title">
          Community in Motion
        </h2>
        <div className="home-landing__grid home-landing__grid--three">
          <article className="home-landing__card">
            <h3 className="home-landing__card-title">Featured posts</h3>
            <p className="home-landing__card-body">
              Real voices from the community—values-driven posts and
              conversations that show what WRDLNKDN is about.
            </p>
          </article>
          <article className="home-landing__card">
            <h3 className="home-landing__card-title">Highlighted members</h3>
            <p className="home-landing__card-body">
              Members who show up: contributors, volunteers, and members
              building the network with intent and participation.
            </p>
          </article>
          <article className="home-landing__card">
            <h3 className="home-landing__card-title">Community stats</h3>
            <p className="home-landing__card-body">
              Growth and activity metrics that reflect a living community—join
              the movement and watch it grow.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};
