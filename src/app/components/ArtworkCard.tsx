"use client";

import React, { useRef, useEffect } from "react";

interface Artwork {
  title: string;
  year: string;
  description: string;
  tokenLink: string;
  videoSrc: string;
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

    // Create an intersection observer that plays the video if more than 10% is visible
    // and pauses it after a delay if less than 10% is visible.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If at least 10% of the video is visible, clear any pending pause and play.
          if (entry.intersectionRatio > 0.1) {
            if (pauseTimeoutRef.current) {
              clearTimeout(pauseTimeoutRef.current);
              pauseTimeoutRef.current = null;
            }
            video.play().catch((error) => {
              console.error("Error playing video:", error);
            });
          } else {
            // If less than 10% is visible, wait a moment before pausing.
            if (!pauseTimeoutRef.current) {
              pauseTimeoutRef.current = window.setTimeout(() => {
                video.pause();
                pauseTimeoutRef.current = null;
              }, 1000); // 1 second delay
            }
          }
        });
      },
      { threshold: [0, 0.1] }, // Trigger callback when visibility passes 10%
    );

    observer.observe(video);

    // Clean up the observer and timeout on unmount
    return () => {
      observer.disconnect();
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white transform shadow transition duration-300 hover:scale-105 hover:shadow-lg">
      {/* Using aspect-square to ensure the video container is square */}
      <div className="bg-black relative aspect-square">
        <video
          ref={videoRef}
          muted
          playsInline
          loop
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
