/**
 * Helpers for painting live JPEG frames onto <img> nodes without a
 * React re-render on every frame (the previous atob + setState path
 * added a lot of preview latency).
 */

export function jpegBytesFromFrame(frame) {
  if (!frame) return null;
  if (frame.data instanceof Uint8Array) return frame.data;
  if (ArrayBuffer.isView(frame.data)) {
    return new Uint8Array(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
  }
  if (frame.data instanceof ArrayBuffer) return new Uint8Array(frame.data);
  if (typeof frame.dataBase64 === "string") {
    try {
      const bin = atob(frame.dataBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch {
      return null;
    }
  }
  return null;
}

export function paintJpegFrame(img, urlsRef, id, bytes) {
  const blob = new Blob([bytes], { type: "image/jpeg" });
  const url = URL.createObjectURL(blob);
  const prev = urlsRef.current[id];
  urlsRef.current[id] = url;
  if (img) img.src = url;
  if (prev) URL.revokeObjectURL(prev);
}

export function revokeFrameUrls(urlsRef) {
  const urls = urlsRef.current;
  Object.keys(urls).forEach((id) => {
    if (urls[id]) URL.revokeObjectURL(urls[id]);
    urls[id] = null;
  });
}
