"use client";

import React, { useRef, useEffect } from "react";

export interface Artwork {
  title: string;
  year: string;
  description: string;
  tokenLink: string;
  videoSrc: string;
  poster: string; // Optional poster image URL
}

interface ArtworkCardProps {
  artwork: Artwork;
}

const ArtworkCard: React.FC<ArtworkCardProps> = ({ artwork }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force the video to load so that the first frame or poster is available.
    video.load();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio > 0.1) {
            if (pauseTimeoutRef.current) {
              clearTimeout(pauseTimeoutRef.current);
              pauseTimeoutRef.current = null;
            }
            video.play().catch((error) => {
              console.error("Error playing video:", error);
            });
          } else {
            if (!pauseTimeoutRef.current) {
              pauseTimeoutRef.current = window.setTimeout(() => {
                video.pause();
                pauseTimeoutRef.current = null;
              }, 1000); // 1 second delay before pausing
            }
          }
        });
      },
      { threshold: [0, 0.1] },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white transform shadow transition duration-300 hover:scale-105 hover:shadow-lg">
      <div className="bg-black relative aspect-square">
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          preload="auto"
          poster={artwork.poster}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source type="video/mp4" src={artwork.videoSrc} />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold">{artwork.title}</h3>
        <p className="text-gray-500 text-sm">{artwork.year}</p>
        <p className="mt-2 text-sm">{artwork.description}</p>
        <a
          href={artwork.tokenLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 mt-4 inline-block text-sm hover:underline"
        >
          View Token
        </a>
      </div>
    </div>
  );
};

export default ArtworkCard;
