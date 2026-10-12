"use client";
export function MediaIcon({
  kind,
}: {
  kind: "play" | "pause" | "expand" | "volume" | "muted";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "play" ? (
        <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />
      ) : kind === "pause" ? (
        <>
          <path d="M8 5v14M16 5v14" strokeWidth="4" />
        </>
      ) : kind === "expand" ? (
        <path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6" />
      ) : (
        <>
          <path d="m11 4-6 5H2v6h3l6 5Z" />
          {kind === "muted" ? (
            <path d="m16 9 6 6m0-6-6 6" />
          ) : (
            <>
              <path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
export function PlaybackButton({
  playing,
  title,
  onClick,
  error = false,
}: {
  playing: boolean;
  title: string;
  onClick: () => void;
  error?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="media-control"
      aria-label={`${error ? "Retry playback of" : playing ? "Pause" : "Play"} ${title}`}
      title={`${playing ? "Pause" : "Play"} ${title}`}
    >
      <MediaIcon kind={playing ? "pause" : "play"} />
    </button>
  );
}
