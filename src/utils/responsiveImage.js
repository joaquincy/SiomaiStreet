/**
 * Generates a srcSet string for responsive images.
 * Maps original image paths to their responsive variants in /images/responsive/.
 *
 * @param {string} src - Original image path, e.g. "/images/menu-classic.png"
 * @param {number[]} widths - Array of widths to include
 * @returns {string} srcSet attribute value
 */
export function getSrcSet(src, widths) {
  const lastSlash = src.lastIndexOf('/');
  const filename = src.substring(lastSlash + 1);
  const dotIndex = filename.lastIndexOf('.');
  const base = filename.substring(0, dotIndex);
  const ext = filename.substring(dotIndex);
  const dir = src.substring(0, lastSlash);

  return widths
    .map(w => `${dir}/responsive/${base}-${w}w${ext} ${w}w`)
    .join(', ');
}
