const galleryImages = document.querySelectorAll(".featured-image-gallery img");
const popupOverlay = document.getElementById("image-popup-overlay");
const closeBtn = document.getElementById("closeBtn");
const popupCarousel = document.getElementById("carouselExampleIndicators");
const popupCarouselIndicators = popupOverlay.querySelector(".carousel-indicators");
const popupCarouselInner = popupOverlay.querySelector(".carousel-inner");
let opener = null;

function loadSlideImage(item) {
  const image = item.querySelector("img");
  if (image && !image.hasAttribute("src")) {
    image.setAttribute("src", image.getAttribute("data-carousel-src"));
  }
}

galleryImages.forEach((image, index) => {
  const indicator = document.createElement("button");
  indicator.type = "button";
  indicator.setAttribute("data-bs-target", "#carouselExampleIndicators");
  indicator.setAttribute("data-bs-slide-to", String(index));
  indicator.setAttribute("aria-label", `Show image ${index + 1}`);
  popupCarouselIndicators.appendChild(indicator);

  const item = document.createElement("div");
  item.className = "carousel-item";
  const popupImage = document.createElement("img");
  popupImage.className = "d-block w-100";
  popupImage.setAttribute("data-carousel-src", image.currentSrc || image.src);
  popupImage.setAttribute("data-carousel-slide", String(index));
  popupImage.alt = image.alt;
  item.appendChild(popupImage);
  popupCarouselInner.appendChild(item);

  const open = () => {
    opener = image;
    const selectedSlide = image.getAttribute("data-showcase-slide");
    const items = popupCarouselInner.querySelectorAll(".carousel-item");
    const indicators = popupCarouselIndicators.querySelectorAll("button");

    items.forEach((slide) => {
      const active = slide.querySelector("img").getAttribute("data-carousel-slide") === selectedSlide;
      slide.classList.toggle("active", active);
      if (active) loadSlideImage(slide);
    });
    indicators.forEach((button) => {
      const active = button.getAttribute("data-bs-slide-to") === selectedSlide;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });

    popupOverlay.classList.add("active");
    popupOverlay.setAttribute("aria-hidden", "false");
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add("no-scroll");
    closeBtn.focus();
  };

  image.addEventListener("click", open);
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
});

popupCarousel.addEventListener("slide.bs.carousel", (event) => {
  if (event.relatedTarget) loadSlideImage(event.relatedTarget);
});

function closePopup() {
  if (!popupOverlay.classList.contains("active")) return;

  popupOverlay.classList.remove("active");
  popupOverlay.setAttribute("aria-hidden", "true");
  const scrollY = Math.abs(parseInt(document.body.style.top || "0", 10));
  document.body.classList.remove("no-scroll");
  document.body.style.top = "";
  window.scrollTo(0, scrollY);
  popupCarouselInner.querySelectorAll(".carousel-item.active").forEach((item) => {
    item.classList.remove("active");
  });
  popupCarouselIndicators.querySelectorAll("button").forEach((button) => {
    button.classList.remove("active");
    button.removeAttribute("aria-current");
  });
  if (opener) opener.focus();
  opener = null;
}

closeBtn.addEventListener("click", closePopup);
popupOverlay.addEventListener("click", (event) => {
  if (event.target === popupOverlay) closePopup();
});
popupOverlay.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closePopup();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = popupOverlay.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const visible = Array.from(focusable).filter(
    (element) => element.getAttribute("aria-hidden") !== "true" && element.tabIndex >= 0
  );
  if (!visible.length) {
    event.preventDefault();
    closeBtn.focus();
    return;
  }

  const first = visible[0];
  const last = visible[visible.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
