/**
 * Keyframe snapping for lossless trims. Copying a video without re-encoding can only start at a
 * keyframe, so the start handle snaps to one and shows exactly where the export begins.
 */

/** The keyframe nearest to a time, among those at or before `latest`. Keyframes are sorted. */
export function snapToKeyframe(keyframes: readonly number[], time: number, latest: number) {
  let nearest = keyframes[0] ?? 0;
  for (const keyframe of keyframes) {
    if (keyframe > latest) break;
    if (Math.abs(keyframe - time) < Math.abs(nearest - time)) nearest = keyframe;
  }
  return nearest;
}

/** The next keyframe after a time, or the previous one before it, staying at or before `latest`. */
export function stepKeyframe(
  keyframes: readonly number[],
  time: number,
  direction: -1 | 1,
  latest: number,
) {
  // A small tolerance keeps a start that sits on a keyframe from counting as between two.
  const tolerance = 1e-6;
  if (direction > 0) {
    const next = keyframes.find(function isAfter(keyframe) {
      return keyframe > time + tolerance;
    });
    return next !== undefined && next <= latest ? next : time;
  }
  const previous = keyframes.findLast(function isBefore(keyframe) {
    return keyframe < time - tolerance;
  });
  return previous ?? time;
}
