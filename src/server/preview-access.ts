import { redirect } from "next/navigation";
import { requireAdmin } from "./auth";
export const isPrivateSite = () =>
  process.env.WAAMBAT_PRIVATE_SITE === "1" ||
  process.env.WAAMBAT_REVIEW_BUILD === "1";
export async function requirePreviewAccess() {
  if (isPrivateSite()) {
    try {
      await requireAdmin();
    } catch {
      redirect("/admin");
    }
  }
}
