import stored from "./site.json";
import { contentSchema } from "~/lib/content";
export const seedContent = contentSchema.parse(stored);
