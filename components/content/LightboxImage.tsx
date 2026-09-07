"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export function LightboxImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <figure className="overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full overflow-hidden"
          aria-label={`Ampliar imagen: ${alt}`}
        >
          <Image
            src={src}
            alt={alt}
            width={600}
            height={400}
            unoptimized
            className="h-56 w-full object-cover transition-transform duration-200 ease-out hover:scale-105"
          />
        </button>
        {caption && (
          <figcaption className="border-t border-border bg-surface px-3 py-2 text-xs text-text-faint">
            {caption}
          </figcaption>
        )}
      </figure>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" />
          </button>
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={800}
            unoptimized
            className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
