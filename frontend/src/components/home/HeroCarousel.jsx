import "../../styles/home/HeroCarousel.css";

const SLIDES = [
  {
    src: "/demo/wallet.png",
    alt: "Кошелёк - баланс и операции",
  },
  {
    src: "/demo/analytics.png",
    alt: "Аналитика - графики и категории",
  },
  {
    src: "/demo/recommendations.png",
    alt: "Рекомендации и прогноз",
  },
];

function HeroCarousel() {
  const trackSlides = [...SLIDES, ...SLIDES];

  return (
    <div className="hero-carousel">
      <div className="hero-carousel-track">
        {trackSlides.map((slide, index) => (
          <div
            key={`${slide.src}-${index}`}
            className="hero-carousel-card"
          >
            <img
              src={slide.src}
              alt={slide.alt}
              loading={index < 3 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeroCarousel;
