import { derived, onMount, watch, state } from "@kerf-js/core";
import { observeMediaViewport } from "@kerf-js/media/browser";
import { firstFramePreview } from "#/lib/first-frame";
import {inlineHeroCover} from "#/lib/hero-cover";
import { paintingPoster } from "#/lib/painting-source";
import images from "#/content/image-media.json";
import type { MediaAsset } from "@kerf-js/core/media";
const imageAssets = images as Record<string, MediaAsset>;
type Props = {
  source: string;
  playbackSource?: string;
  fallback: string;
  mobileSource?: string;
  mobileFallback?: string;
  media?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  concealed?: boolean;
  onReady?: (source: string, poster?: string) => void;
};
/** The movie starts behind a sharp first-frame picture, never a blown-up blur thumbnail. */
export default function VideoStill(props: Props) {
  let image: HTMLImageElement | undefined;
  const activated = state(false),
    active = derived(() => !!props.priority || activated.value);
  const desktop = derived(() => firstFramePreview(props.source)),
    mobile = derived(() => firstFramePreview(props.mobileSource));
  const fallback = derived(() => paintingPoster(props.fallback));
  const fallbackAsset = derived(() => imageAssets[props.fallback]);
  const mobileFallback = derived(() => imageAssets[props.mobileFallback ?? props.fallback]);
  const notify = () => {
    const selected =
      props.mobileSource && props.media && matchMedia(props.media).matches
        ? props.mobileSource
        : props.source;
    props.onReady?.(
      props.playbackSource ?? selected,
      image?.naturalWidth ? image.currentSrc : undefined,
    );
  };
  const inlineDesktop=derived(()=>props.priority?inlineHeroCover(desktop.value):undefined);
  const inlineMobile=derived(()=>props.priority?inlineHeroCover(mobile.value):undefined);
  const coverSet=(asset: typeof desktop.value | typeof fallbackAsset.value)=>
    asset?.sources.find(item=>item.type==='image/webp')?.srcset ?? asset?.sources.at(-1)?.srcset;
  const still = derived(
    () => inlineDesktop.value || desktop.value?.src || fallbackAsset.value?.src || props.fallback || "",
  );
  // Report a settled still so an attached native player can reuse its cached URL.
  // Player mounting and source attachment run independently of image completion.
  onMount(() =>
    watch(
      () => [
        props.source,
        props.mobileSource,
        props.playbackSource,
        desktop.value?.src,
        mobile.value?.src,
        still.value,
        active.value,
      ],
      () => {
        if (active.value && (!still.value || (image?.complete && image.hasAttribute("src"))))
          notify();
      },
    ),
  );
  onMount(() => {
    if (!image) return;
    let near = false,
      disposed = false,
      waiting = false;
    const prepare = () => {
      activated.value = true;
    };
    image.addEventListener("kerf:prepare-poster", prepare);
    const stop = observeMediaViewport(image, (status) => {
      near = status.visible || status.preparing;
      if (!near || activated.value) return;
      const critical = [
        ...document.querySelectorAll<HTMLImageElement>('img[fetchpriority="high"]'),
      ].filter((i) => !i.complete);
      if (!status.visible && critical.length) {
        if (!waiting) {
          waiting = true;
          void Promise.all(critical.map((i) => i.decode().catch(() => {}))).then(() => {
            waiting = false;
            if (!disposed && near) prepare();
          });
        }
      } else prepare();
    });
    return () => {
      disposed = true;
      stop();
      image?.removeEventListener("kerf:prepare-poster", prepare);
    };
  });
  const render = () => (
    <picture
      class="block h-full w-full"
      style={{
        position: "relative",
        zIndex: 1,
        pointerEvents: "none",
        opacity: props.concealed ? 0 : 1,
      }}
    >
      {props.mobileSource && props.media && <source
        type={inlineMobile.value || (mobile.value ?? mobileFallback.value)?.sources.some(item=>item.type==='image/webp') ? 'image/webp' : undefined}
        srcSet={inlineMobile.value || coverSet(mobile.value ?? mobileFallback.value) || mobile.value?.src || mobileFallback.value?.src || props.mobileFallback || props.fallback}
        media={props.media} sizes={props.sizes ?? '100vw'}/>}
      {still.value && (
        <img
          ref={(node) => {
            image = node;
          }}
          data-save-source={props.source}
          data-video-first-frame
          src={still.value}
          srcSet={inlineDesktop.value ? undefined : coverSet(desktop.value ?? fallbackAsset.value) ?? fallback.value.srcSet}
          sizes={props.sizes ?? "(max-width: 767px) calc(100vw - 40px), 960px"}
          width={desktop.value?.width ?? fallbackAsset.value?.width ?? 960}
          height={desktop.value?.height ?? fallbackAsset.value?.height ?? 960}
          alt={props.alt}
          className={props.className ?? "h-full w-full object-contain"}
          loading={props.priority || active.value ? "eager" : "lazy"}
          fetchPriority={props.priority ? "high" : "auto"}
          decoding={props.priority ? "sync" : "async"}
          onLoad={notify}
          onError={notify}
        />
      )}
    </picture>
  );
  // Native lazy loading discovers the current cover before JavaScript initializes.
  return render();
}
