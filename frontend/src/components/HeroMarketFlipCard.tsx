import { useState, type MouseEvent } from 'react';
import './HeroMarketFlipCard.css';

export default function HeroMarketFlipCard() {
  const [flipped, setFlipped] = useState(false);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const touchInput = window.matchMedia('(hover: none)').matches;
    const keyboardInput = event.detail === 0;
    if (touchInput || keyboardInput) setFlipped((current) => !current);
  }

  return (
    <div className="hero-market-flip">
      <button
        type="button"
        className={`hero-market-flip__card${flipped ? ' is-flipped' : ''}`}
        aria-label="Flip between bull and bear market illustrations"
        tabIndex={0}
        onClick={handleClick}
      >
        <span className="hero-market-flip__inner">
          <span className="hero-market-flip__face hero-market-flip__front">
            <img
              src="/images/bull.png"
              width={2400}
              height={1792}
              alt="Bull market illustration"
              decoding="async"
            />
          </span>
          <span className="hero-market-flip__face hero-market-flip__back">
            <img
              src="/images/bear.png"
              width={2400}
              height={1792}
              alt="Bear market illustration"
              loading="lazy"
              decoding="async"
            />
          </span>
        </span>
      </button>
    </div>
  );
}
