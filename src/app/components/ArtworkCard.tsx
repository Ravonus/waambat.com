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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Create an intersection observer that plays the video when at least 50% is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch((error) => {
              console.error("Error playing video:", error);
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.2 }, // Adjust threshold as needed
    );

    observer.observe(video);

    // Clean up the observer on unmount
    return () => {
      observer.disconnect();
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
