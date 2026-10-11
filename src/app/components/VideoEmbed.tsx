"use client";
import { useState } from "react";
export default function VideoEmbed({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="my-8 aspect-video w-full bg-black">
      {loaded ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="h-full w-full border-0"
        />
      ) : (
        <button
          onClick={() => setLoaded(true)}
          className="text-waambat-pink relative flex h-full w-full items-center justify-center border border-white/20"
          aria-label={`Play ${title}`}
        >
          {src.startsWith("https://www.youtube-nocookie.com/embed/") && (
            // eslint-disable-next-line @next/next/no-img-element -- Same source thumbnail as the original YouTube embed.
            <img
              src={`https://i.ytimg.com/vi/${src.split("/").at(-1)}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          <span className="relative bg-black/80 px-4 py-2">▶ {title}</span>
        </button>
      )}
    </div>
  );
}
