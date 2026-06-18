import {
  useEffect,
  useId,
  useRef,
} from "react";

import {
  lockModalBody,
  unlockModalBody,
} from "../utils/modalBodyLock";

const modalStack = [];

function pushModal(id) {
  modalStack.push(id);
}

function popModal(id) {
  const index = modalStack.lastIndexOf(id);

  if (index !== -1) {
    modalStack.splice(index, 1);
  }
}

function isTopModal(id) {
  return modalStack[modalStack.length - 1] === id;
}

function useModal({
  isOpen,
  onClose,
}) {
  const overlayRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const modalId = useId();

  onCloseRef.current = onClose;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== "Escape") {
        return;
      }

      if (!isTopModal(modalId)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onCloseRef.current();
    };

    if (!isOpen) {
      return undefined;
    }

    pushModal(modalId);
    lockModalBody();

    const resetOverlayScroll = () => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = 0;
      }
    };

    resetOverlayScroll();

    const frameId = requestAnimationFrame(
      resetOverlayScroll
    );

    document.addEventListener(
      "keydown",
      handleEsc,
      true
    );

    return () => {
      cancelAnimationFrame(frameId);
      popModal(modalId);
      unlockModalBody();

      document.removeEventListener(
        "keydown",
        handleEsc,
        true
      );
    };
  }, [isOpen, modalId]);

  const handleOverlayClick = () => {
    onCloseRef.current();
  };

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return {
    handleOverlayClick,
    handleModalClick,
    overlayRef,
  };
}

export default useModal;
