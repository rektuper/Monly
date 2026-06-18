import { FiChevronDown } from "react-icons/fi";

import "../../styles/home/HomeScrollHint.css";

function HomeScrollHint({ onClick }) {
  return (
    <button
      type="button"
      className="home-scroll-hint"
      onClick={onClick}
      aria-label="Прокрутить вниз и узнать больше о возможностях"
    >
      <span className="home-scroll-hint__label">Узнать больше</span>
      <span className="home-scroll-hint__icon-wrap" aria-hidden="true">
        <FiChevronDown className="home-scroll-hint__icon" />
      </span>
    </button>
  );
}

export default HomeScrollHint;
