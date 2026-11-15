import { AdminError } from "./auth";
export async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AdminError(413, "Request is too large");
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, "Request body is required");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new AdminError(413, "Request is too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
