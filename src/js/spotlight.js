/**
 * REACTBITS & MAGIC UI SPOTLIGHT & TACTILE 3D TILT ENGINE
 * Tracks mouse coordinates across interactive cards and wooden blocks,
 * creating subtle cursor-following radial highlights and organic 3D tilt physics.
 */

export function initSpotlightAndTilt() {
  // 1. Mouse Spotlight Effect (Reactbits / Magic UI pattern)
  const spotlightCards = document.querySelectorAll('.spotlight-card, .wooden-block-btn, .bento-card, .feed-card, .chaos-card');

  spotlightCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // 2. 3D Tilt Physics on Interactive Beechwood Blocks
  const blocks = document.querySelectorAll('.wooden-block-btn');

  blocks.forEach(block => {
    block.addEventListener('mousemove', (e) => {
      const rect = block.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const rotateX = ((mouseY / height) - 0.5) * -12; // tilt degrees
      const rotateY = ((mouseX / width) - 0.5) * 12;

      block.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px) scale3d(1.02, 1.02, 1.02)`;
    });

    block.addEventListener('mouseleave', () => {
      block.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)';
    });
  });
}
