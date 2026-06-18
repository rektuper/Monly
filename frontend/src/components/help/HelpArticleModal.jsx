import { FiX } from "react-icons/fi";

import useModal from "../../hooks/useModal";
import ModalPortal from "../shared/ModalPortal";

import "../../styles/shared/HelpArticleModal.css";

function HelpArticleModal({ article, isOpen, onClose }) {
  const {
    handleOverlayClick,
    handleModalClick,
    overlayRef,
  } = useModal({
    isOpen,
    onClose,
  });

  if (!isOpen || !article) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        ref={overlayRef}
        className="help-modal-overlay"
        onClick={handleOverlayClick}
      >
        <div
          className="help-modal"
          onClick={handleModalClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <header className="help-modal-header">
            <h2 id="help-modal-title">{article.title}</h2>
            <button
              type="button"
              className="help-modal-close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <FiX />
            </button>
          </header>

          <div className="help-modal-body">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                {section.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default HelpArticleModal;
