const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 256;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function getCoverScale(naturalWidth, naturalHeight) {
  return Math.max(
    VIEWPORT_SIZE / naturalWidth,
    VIEWPORT_SIZE / naturalHeight
  );
}

export function getContainScale(naturalWidth, naturalHeight) {
  return Math.min(
    VIEWPORT_SIZE / naturalWidth,
    VIEWPORT_SIZE / naturalHeight
  );
}

export function getScaleLimits(naturalWidth, naturalHeight) {
  const coverScale = getCoverScale(naturalWidth, naturalHeight);
  const containScale = getContainScale(naturalWidth, naturalHeight);

  return {
    coverScale,
    containScale,
    minScale: containScale * 0.65,
    maxScale: coverScale * 3,
    initialScale: coverScale * 1.05,
  };
}

export function clampCropOffset(
  naturalWidth,
  naturalHeight,
  scale,
  offsetX,
  offsetY
) {
  const dispW = naturalWidth * scale;
  const dispH = naturalHeight * scale;

  const minX = VIEWPORT_SIZE / 2 - dispW / 2;
  const maxX = dispW / 2 - VIEWPORT_SIZE / 2;
  const minY = VIEWPORT_SIZE / 2 - dispH / 2;
  const maxY = dispH / 2 - VIEWPORT_SIZE / 2;

  return {
    x: Math.min(maxX, Math.max(minX, offsetX)),
    y: Math.min(maxY, Math.max(minY, offsetY)),
  };
}

export async function getCroppedAvatarBlob(
  imageSrc,
  scale,
  offsetX,
  offsetY
) {
  const image = await loadImage(imageSrc);
  const clamped = clampCropOffset(
    image.naturalWidth,
    image.naturalHeight,
    scale,
    offsetX,
    offsetY
  );

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const dispW = image.naturalWidth * scale;
  const dispH = image.naturalHeight * scale;
  const left = (VIEWPORT_SIZE - dispW) / 2 + clamped.x;
  const top = (VIEWPORT_SIZE - dispH) / 2 + clamped.y;

  const sx = -left / scale;
  const sy = -top / scale;
  const sWidth = VIEWPORT_SIZE / scale;
  const sHeight = VIEWPORT_SIZE / scale;

  const sourceX = Math.max(0, sx);
  const sourceY = Math.max(0, sy);
  const sourceRight = Math.min(image.naturalWidth, sx + sWidth);
  const sourceBottom = Math.min(image.naturalHeight, sy + sHeight);
  const sourceW = sourceRight - sourceX;
  const sourceH = sourceBottom - sourceY;

  if (sourceW <= 0 || sourceH <= 0) {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.88
      );
    });
  }

  const destX = ((sourceX - sx) / sWidth) * OUTPUT_SIZE;
  const destY = ((sourceY - sy) / sHeight) * OUTPUT_SIZE;
  const destW = (sourceW / sWidth) * OUTPUT_SIZE;
  const destH = (sourceH / sHeight) * OUTPUT_SIZE;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    destX,
    destY,
    destW,
    destH
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.88
    );
  });
}

export { VIEWPORT_SIZE };
