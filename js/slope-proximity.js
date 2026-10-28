/** Find the closest slope at a given horizontal position, using vertical distance.
 * Coordinates and tolerance must be in the same units. Returns null outside
 * the year span or when no slope falls within the tolerance.
 */
export function nearestSlope(segments, x, y, x0, x1, tolerance, previous = null) {
  if (![x,y,x0,x1,tolerance].every(Number.isFinite) || x1 <= x0 || tolerance < 0 || x < x0 || x > x1) return null;
  const t = (x-x0)/(x1-x0);
  let best = null;
  segments.forEach(({y0,y1}, index) => {
    const distance = Math.abs(y-(y0+(y1-y0)*t));
    if (!Number.isFinite(distance) || distance > tolerance) return;
    if (best === null || distance < best.distance - 1e-9 ||
        (Math.abs(distance-best.distance) <= 1e-9 && index === previous)) {
      best = {index,distance};
    }
  });
  return best;
}
