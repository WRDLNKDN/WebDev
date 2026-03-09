import { Home } from '../pages/home/Home';

export const PublicHomeSurface = () => {
  return (
    <div
      data-testid="app-main"
      style={{
        minHeight: '100vh',
        overflowX: 'hidden',
        backgroundColor: '#05070f',
      }}
    >
      <Home />
    </div>
  );
};
