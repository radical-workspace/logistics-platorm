'use client';
/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from 'react';

type ClientImageProps = ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string };

export default function ClientImage({
  alt = '',
  priority: _priority,
  fallbackSrc = '/hero-home.jpg',
  ...props
}: ClientImageProps & { priority?: boolean }) {
  void _priority;
  // Remove 'priority' before passing to <img>
  return (
    <img
      alt={alt}
      {...props}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (img.src.endsWith(fallbackSrc)) {
          img.style.display = 'none';
        } else {
          img.src = fallbackSrc;
        }
        props.onError?.(e);
      }}
    />
  );
}
