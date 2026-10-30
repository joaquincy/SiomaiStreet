/**
 * siteData.js
 * Central store for site-wide constants and brand data.
 * Import from here instead of hard-coding values in components.
 */

export const BRAND = {
  name: 'Siomai Street',
  tagline: "The Streets' Favorite Siomai",
  emoji: '🥟',
  founded: 2015,
};

export const CONTACT = {
  phone: '+63 912 345 6789',
  phoneHref: 'tel:+639123456789',
  email: 'franchise@siomaistreet.ph',
  address: 'Manila, Philippines',
  hours: 'Mon–Sat: 8AM – 6PM',
};

export const SOCIALS = {
  facebook: 'https://www.facebook.com/siomaistreetfoods',
  instagram: 'https://www.instagram.com/siomaistreetph',
  tiktok: 'https://www.tiktok.com/@siomaistreetph',
};

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Menu', to: '/menu' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Apply', to: '/application' },
];
