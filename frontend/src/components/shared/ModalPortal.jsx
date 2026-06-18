import { createPortal } from "react-dom";

function ModalPortal({ isOpen, children }) {
  if (!isOpen) {
    return null;
  }

  return createPortal(children, document.body);
}

export default ModalPortal;
