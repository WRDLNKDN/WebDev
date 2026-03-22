/**
 * When true (default), Layout uses a solid black (#000) matte on `/` only while the
 * hero video is playing; after copy is revealed, the normal synthwave / photo background returns.
 * Set `VITE_HOME_MATTE_UNTIL_CONTENT_REVEAL=false` to always show the grid on home.
 */
export function homeMatteUntilContentRevealEnabled(): boolean {
  const raw = (
    import.meta.env.VITE_HOME_MATTE_UNTIL_CONTENT_REVEAL as string | undefined
  )
    ?.trim()
    .toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false;
  }
  return true;
}
