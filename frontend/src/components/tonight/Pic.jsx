import React from 'react';

// A picture in the smallest format the browser supports: AVIF, then WebP, then the JPEG.
// `src` is the .jpg path; the .avif and .webp copies sit next to it (scripts/web/modern_formats.py makes them).
export default function Pic({ src, className, style, ...img }) {
  const [path, query] = src.split('?');   // a ?v= version stamp rides along to every format
  const base = path.replace(/\.jpg$/, ''), q = query ? `?${query}` : '';
  return (
    <picture className={className} style={style}>
      <source srcSet={`${base}.avif${q}`} type="image/avif" />
      <source srcSet={`${base}.webp${q}`} type="image/webp" />
      <img src={src} alt="" {...img} />
    </picture>
  );
}
