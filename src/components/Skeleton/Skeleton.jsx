import './Skeleton.css';

/**
 * Universal Skeleton Loading Primitive
 *
 * @param {'text'|'title'|'rect'|'circular'|'pill'|'card'} variant - Skeleton shape
 * @param {'light'|'dark'} theme - Color theme (light/cream or dark obsidian)
 * @param {string|number} width - CSS width value
 * @param {string|number} height - CSS height value
 * @param {string} className - Optional additional CSS class names
 * @param {object} style - Optional inline styles
 */
export default function Skeleton({
  variant = 'rect',
  theme = 'light',
  width,
  height,
  className = '',
  style = {},
  ...rest
}) {
  const inlineStyles = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...style,
  };

  const classes = [
    'skeleton-box',
    `skeleton-box--${variant}`,
    theme === 'dark' ? 'skeleton-box--dark' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      style={inlineStyles}
      aria-hidden="true"
      {...rest}
    />
  );
}
