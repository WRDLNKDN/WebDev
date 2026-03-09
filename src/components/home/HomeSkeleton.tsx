export const HomeSkeleton = () => {
  return (
    <div className="home-landing__skeleton" aria-hidden="true">
      <div className="home-landing__skeleton-panel">
        <div>
          <div className="home-landing__skeleton-line home-landing__skeleton-line--lg home-landing__skeleton-line--wide" />
          <div className="home-landing__skeleton-line home-landing__skeleton-line--lg home-landing__skeleton-line--mid" />
          <div
            className="home-landing__skeleton-line"
            style={{ width: '90%', marginTop: '1rem' }}
          />
          <div
            className="home-landing__skeleton-pill"
            style={{ marginTop: '2rem' }}
          />
          <div
            className="home-landing__skeleton-pill"
            style={{ marginTop: '1rem', opacity: 0.65 }}
          />
        </div>
        <div className="home-landing__skeleton-orb" />
      </div>
    </div>
  );
};
