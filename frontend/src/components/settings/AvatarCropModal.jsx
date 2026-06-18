import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FiCheck, FiX, FiZoomIn } from "react-icons/fi";

import {
  clampCropOffset,
  getCroppedAvatarBlob,
  getScaleLimits,
  VIEWPORT_SIZE,
} from "../../utils/cropAvatar";

import "../../styles/shared/AvatarCropModal.css";

function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  saving = false,
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scaleLimits, setScaleLimits] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const dragRef = useRef(null);

  const applyClampedOffset = useCallback((
    nextScale,
    nextOffset,
    size = imageSize
  ) => {
    if (!size) {
      return nextOffset;
    }

    return clampCropOffset(
      size.width,
      size.height,
      nextScale,
      nextOffset.x,
      nextOffset.y
    );
  }, [imageSize]);

  useEffect(() => {
    if (imageSrc) {
      setScaleLimits(null);
      setImageSize(null);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [imageSrc]);

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target;
    const limits = getScaleLimits(naturalWidth, naturalHeight);

    setImageSize({
      width: naturalWidth,
      height: naturalHeight,
    });
    setScaleLimits(limits);
    setScale(limits.initialScale);
    setOffset({ x: 0, y: 0 });
  };

  const handleScaleChange = (nextScale) => {
    setScale(nextScale);
    setOffset((current) => applyClampedOffset(nextScale, current));
  };

  if (!isOpen || !imageSrc) {
    return null;
  }

  const handlePointerDown = (event) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) {
      return;
    }

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    const nextOffset = applyClampedOffset(scale, {
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });

    setOffset(nextOffset);
  };

  const handlePointerUp = (event) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSave = async () => {
    const clamped = applyClampedOffset(scale, offset);
    const blob = await getCroppedAvatarBlob(
      imageSrc,
      scale,
      clamped.x,
      clamped.y
    );

    onSave(blob);
  };

  const sliderMin = scaleLimits?.minScale ?? 0.2;
  const sliderMax = scaleLimits?.maxScale ?? 3;

  return (
    <div className="avatar-crop-overlay" onClick={onClose}>
      <div
        className="avatar-crop-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Обрезка аватара</h3>
        <p>Перетащите фото и настройте масштаб</p>

        <div
          className="avatar-crop-viewport"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={imageSrc}
            alt=""
            className="avatar-crop-image"
            onLoad={handleImageLoad}
            style={{
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
            }}
            draggable={false}
          />
          <div className="avatar-crop-ring" />
        </div>

        <label className="avatar-crop-zoom">
          <FiZoomIn />
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={Math.max(0.01, (sliderMax - sliderMin) / 200)}
            value={Math.min(sliderMax, Math.max(sliderMin, scale))}
            onChange={(event) =>
              handleScaleChange(Number(event.target.value))
            }
          />
        </label>

        <div className="avatar-crop-actions">
          <button
            type="button"
            className="avatar-crop-btn cancel"
            onClick={onClose}
            disabled={saving}
          >
            <FiX />
            Отмена
          </button>
          <button
            type="button"
            className="avatar-crop-btn save"
            onClick={handleSave}
            disabled={saving}
          >
            <FiCheck />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarCropModal;
