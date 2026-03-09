export const WhatMakesDifferent = () => {
  return (
    <section
      className="home-landing__section home-landing__section--base"
      aria-labelledby="what-makes-different-heading"
    >
      <div className="home-landing__container">
        <h2
          id="what-makes-different-heading"
          className="home-landing__section-title"
        >
          What Makes This Different
        </h2>
        <div className="home-landing__grid home-landing__grid--two">
          <article className="home-landing__card">
            <h3 className="home-landing__card-title">Values and intent</h3>
            <p className="home-landing__card-body">
              WRDLNKDN is built around shared values and clear intent. Your
              profile reflects what you care about and how you want to show up,
              so connections are meaningful, not noisy.
            </p>
          </article>
          <article className="home-landing__card">
            <h3 className="home-landing__card-title">
              How participation works
            </h3>
            <p className="home-landing__card-body">
              Participation is the engine. Contribute, show up, and the network
              grows with you. No algorithms pushing engagement, just people
              building a professional community on values and participation.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};
