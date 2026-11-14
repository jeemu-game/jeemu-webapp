import React from 'react';

// A picture in the smallest format the browser supports: AVIF, then WebP, then the JPEG.
// `src` is the .jpg path; the .avif and .webp copies sit next to it (scripts/web/modern_formats.py makes them).
export default function Pic({ src, ...img }) {
  const base = src.replace(/\.jpg$/, '');
  return (
    <picture>
      <source srcSet={`${base}.avif`} type="image/avif" />
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img src={src} alt="" {...img} />
    </picture>
  );
}
