import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize2 } from 'lucide-react';
import { CAROUSEL_SLIDES } from '../data/carouselSlides';

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoPlayTimer = useRef(null);

  const totalSlides = CAROUSEL_SLIDES.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (idx) => {
    setCurrentIndex(idx);
  };

  // Auto-advance loop
  useEffect(() => {
    if (!isPaused) {
      autoPlayTimer.current = setInterval(nextSlide, 5500);
    }
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPaused, currentIndex]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextSlide(); // Swiped left
    } else if (distance < -50) {
      prevSlide(); // Swiped right
    }
  };

  return (
    <div 
      className="carousel-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Viewport & Track */}
      <div 
        className="carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="carousel-track" 
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {CAROUSEL_SLIDES.map((slide, idx) => (
            <div key={slide.id} className="carousel-slide-item">
              {slide.type === 'video' ? (
                <video 
                  src={slide.src} 
                  poster={slide.poster} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="carousel-media" 
                />
              ) : (
                <img 
                  src={slide.src} 
                  alt={slide.title} 
                  className="carousel-media" 
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              )}

              {/* Gradient Overlay with dynamic caption */}
              <div className="carousel-overlay">
                <span className="slide-badge">{slide.badge}</span>
                <h3 className="slide-title">{slide.title}</h3>
                <p className="slide-desc">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="carousel-controls-bar">
        {/* Progress Pills */}
        <div className="carousel-pills-row">
          {CAROUSEL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              className={`carousel-pill-btn ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
              aria-label={`Jump to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Counter & Arrow Nav */}
        <div className="carousel-nav-btns">
          <span className="carousel-counter-text">
            {String(currentIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>

          <button 
            className="carousel-arrow-btn" 
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>

          <button 
            className="carousel-arrow-btn" 
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>

          <button
            className="carousel-arrow-btn"
            onClick={() => setIsPaused(!isPaused)}
            aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
