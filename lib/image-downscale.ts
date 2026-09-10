// Shrinks a photo in the browser before it is uploaded.
//
// Browser-only: uses canvas, so only import this from a client component.
//
// Polly photographs pieces on her phone, where a single shot is routinely
// 3-6MB and 4000px across. Two problems with sending that as-is:
//
//   It runs into the server action body limit, which is the whole reason
//   photo uploads were failing.
//
//   More importantly, her customers then download it. The shop grid is the
//   first thing anyone sees, and a page of 4MB photos is slow on the phone
//   most of them are browsing on — and every one of those is a request the
//   site pays for.
//
// 2000px is larger than the biggest frame the storefront ever renders, so
// nothing visible is lost. Quality 0.85 is the usual point where JPEG
// artefacts stop being findable without pixel-peeping.
//
// Every failure path returns the original file rather than throwing. A photo
// that uploads at full size is a mild problem; a photo that won't upload at
// all is the one we're fixing.

const MAX_EDGE = 2000;
const QUALITY = 0.85;
// Below this, shrinking buys little and risks making a small file bigger.
const SKIP_UNDER_BYTES = 600 * 1024;

export async function downscaleImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    // Throws for a format this browser can't decode — HEIC in Chrome, say.
    // The original then goes up and the server explains the format properly.
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_EDGE / longest);

    if (scale === 1 && file.size <= SKIP_UNDER_BYTES) {
      bitmap.close?.();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );

    // A photo already smaller than what we'd produce keeps its original.
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
