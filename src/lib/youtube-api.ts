let pending: Promise<typeof YT> | undefined;
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}
export function youtubeAPI(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const timeout = setTimeout(() => unavailable(), 15000);
    const unavailable = () => {
      clearTimeout(timeout);
      pending = undefined;
      script.remove();
      reject(new Error("YouTube API unavailable"));
    };
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      previous?.();
      resolve(window.YT);
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = unavailable;
    document.head.append(script);
  });
  return pending;
}
