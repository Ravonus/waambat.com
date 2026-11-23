import { writeImageIndex } from "./media/image-index.mjs";
import { writeVideoIndex } from "./media/video-index.mjs";
import { writeStreamIndex } from "./media/stream-index.mjs";
console.log(JSON.stringify({ ...(await writeImageIndex()), ...(await writeVideoIndex()), ...(await writeStreamIndex()) }));
