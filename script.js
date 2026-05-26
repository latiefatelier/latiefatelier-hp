const navToggle = document.querySelector(".nav-toggle");
const globalNav = document.querySelector(".global-nav");

if (navToggle && globalNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    globalNav.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  });

  globalNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navToggle.setAttribute("aria-expanded", "false");
      globalNav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    }
  });
}

function initHairstyleFilter() {
  const filterButtons = document.querySelectorAll("[data-filter]");
  const styleCards = document.querySelectorAll("[data-category]");

  if (!filterButtons.length || !styleCards.length) {
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedCategory = button.dataset.filter;

      filterButtons.forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });

      styleCards.forEach((card) => {
        const shouldShow = selectedCategory === "all" || card.dataset.category === selectedCategory;
        card.classList.toggle("is-hidden", !shouldShow);
      });
    });
  });
}

initHairstyleFilter();

function initHeroVideo() {
  const heroVideo = document.querySelector(".hero-video-media");

  if (!(heroVideo instanceof HTMLVideoElement)) {
    return;
  }

  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.loop = true;
  heroVideo.autoplay = true;
  heroVideo.playsInline = true;

  const playVideo = () => {
    const playPromise = heroVideo.play();

    if (playPromise) {
      playPromise.catch(() => {
        document.addEventListener("touchstart", playVideo, { once: true });
      });
    }
  };

  heroVideo.addEventListener("ended", () => {
    heroVideo.currentTime = 0;
    playVideo();
  });

  heroVideo.addEventListener("canplay", playVideo, { once: true });
  playVideo();
}

initHeroVideo();
