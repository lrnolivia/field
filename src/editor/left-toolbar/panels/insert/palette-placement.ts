/** Adjacent placement follows the measured parent, never a fixed rail width.
 * If neither side can hold usable cards, the same content flows below its menu. */
export function placeInsertPalette(parent: { left: number; right: number }, viewportWidth: number, desiredWidth = 270) {
  const gutter = 8;
  const rightRoom = viewportWidth - parent.right - gutter;
  const leftRoom = parent.left - gutter;
  const opensLeft = rightRoom < Math.min(224, desiredWidth) && leftRoom > rightRoom;
  const available = opensLeft ? leftRoom : rightRoom;
  const width = Math.min(desiredWidth, Math.max(0, available));
  return { inline: width < Math.min(224, desiredWidth), opensLeft, width,
    left: opensLeft ? parent.left - width : parent.right };
}
