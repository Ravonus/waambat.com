import { writeImageIndex } from "./media/image-index.mjs";
import { writeVideoIndex } from "./media/video-index.mjs";
console.log(JSON.stringify({ ...(await writeImageIndex()), ...(await writeVideoIndex()) }));
