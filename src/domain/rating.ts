/** Ratings below this floor draw no bar; the bar spans the floor to a perfect 10. */
const RATING_BAR_FLOOR = 5;
const RATING_BAR_RANGE = 5;

export const formatRating = (rating: number): string => rating.toFixed(1);

/** Width of the rating bar as a fraction of the poster: `(rating − 5) / 5`, clamped to 0..1. */
export function ratingBarFraction(rating: number | null): number {
  if (rating === null) {
    return 0;
  }

  const fraction = (rating - RATING_BAR_FLOOR) / RATING_BAR_RANGE;

  return Math.min(1, Math.max(0, fraction));
}
