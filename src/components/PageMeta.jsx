import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Siomai Street';
const SITE_ORIGIN = 'https://www.siomaistreet.online';
const PUBLIC_PATHS = new Set(['/', '/menu', '/reviews', '/privacy', '/terms', '/cookies']);
const DEFAULT_DESCRIPTION = "The Philippines' favorite siomai franchise. Start your own food business with low investment and high returns.";
const DEFAULT_IMAGE = '/images/siomai street logo.png';

/**
 * PageMeta — sets per-page <title>, <meta description>, and Open Graph tags.
 *
 * Usage:
 *   <PageMeta
 *     title="Menu"
 *     description="Browse our full menu..."
 *   />
 *
 * The title will render as "Menu — Siomai Street" in the browser tab.
 */
const PageMeta = ({ title, description, image, path }) => {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — The Streets' Favorite Siomai`;
  const desc = description || DEFAULT_DESCRIPTION;
  const ogImage = new URL(image || DEFAULT_IMAGE, SITE_ORIGIN).href;
  const pageUrl = path ? new URL(path, SITE_ORIGIN).href : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {PUBLIC_PATHS.has(path) && <link rel="canonical" href={pageUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      {pageUrl && <meta property="og:url" content={pageUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default PageMeta;
