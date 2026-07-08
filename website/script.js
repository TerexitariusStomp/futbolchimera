document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.style.background = 'rgba(6, 33, 26, 0.95)';
    } else {
      header.style.background = 'rgba(6, 33, 26, 0.85)';
    }
  });

  // Smooth scroll for anchor links handled by CSS scroll-behavior.
  // Add subtle reveal animation for feature cards.
  const cards = document.querySelectorAll('.feature-card, .app-card, .resource-card, .template-card');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  cards.forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(18px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });
});
