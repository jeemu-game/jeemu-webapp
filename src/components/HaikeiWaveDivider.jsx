import React from 'react';

export default function HaikeiWaveDivider({ variant = 1 }) {
  if (variant === 2) {
    return (
      <div className="haikei-wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
          <path
            d="M0,40L60,45.3C120,50.7,240,61.3,360,61.3C480,61.3,600,50.7,720,40C840,29.3,960,18.7,1080,24C1200,29.3,1320,50.7,1380,61.3L1440,72L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
            fill="url(#haikei-wave-grad-2)"
          />
          <path
            d="M0,56L60,58.7C120,61.3,240,66.7,360,64C480,61.3,600,50.7,720,48C840,45.3,960,50.7,1080,56C1200,61.3,1320,66.7,1380,69.3L1440,72L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
            fill="#0c100e"
          />
          <defs>
            <linearGradient id="haikei-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d97e" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#74d99f" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00d97e" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (variant === 3) {
    return (
      <div className="haikei-wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
          <path
            d="M0,20L60,26.7C120,33.3,240,46.7,360,48C480,49.3,600,38.7,720,32C840,25.3,960,22.7,1080,28C1200,33.3,1320,46.7,1380,53.3L1440,60L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
            fill="url(#haikei-wave-grad-3)"
          />
          <path
            d="M0,42L60,45.3C120,48.7,240,55.3,360,54C480,52.7,600,43.3,720,39.3C840,35.3,960,36.7,1080,40.7C1200,44.7,1320,51.3,1380,54.7L1440,58L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
            fill="#0c100e"
          />
          <defs>
            <linearGradient id="haikei-wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d97e" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#00a85e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#74d99f" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div className="haikei-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
        <path
          d="M0,28L60,33.3C120,38.7,240,49.3,360,54.7C480,60,600,60,720,50.7C840,41.3,960,22.7,1080,22.7C1200,22.7,1320,41.3,1380,50.7L1440,60L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
          fill="url(#haikei-wave-grad-1)"
        />
        <path
          d="M0,45L60,48C120,51.3,240,57.3,360,56C480,54.7,600,46,720,42C840,38,960,38,1080,42.7C1200,47.3,1320,56,1380,60.7L1440,65.3L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
          fill="#0c100e"
        />
        <defs>
          <linearGradient id="haikei-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00a85e" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#00d97e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#74d99f" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
