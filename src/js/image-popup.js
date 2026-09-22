const galleryImages = document.querySelectorAll(".featured-image-gallery img");
const popupOverlay = document.getElementById("image-popup-overlay");
// const popupImage = document.getElementById("image-popup");
const closeBtn = document.getElementById("closeBtn");
const popupCarouselIndicators = document.querySelector(
  ".image-popup-overlay .carousel-indicators"
);
const popupCarouselInner = document.querySelector(
  ".image-popup-overlay .carousel-inner"
);
var temp = 0;

galleryImages.forEach((image) => {
  popupCarouselIndicators.insertAdjacentHTML(
    "beforeend",
    '<button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to=' +
      temp +
      ' aria-label="Slide ' +
      temp +
      '"></button>'
  );
  popupCarouselInner.insertAdjacentHTML(
    "beforeend",
    '<div class="carousel-item"><img src="' +
      image.src +
      '" class="d-block w-100" data-carousel-slide="' +
      temp +
      '" alt="' +
      image.alt +
      '" /></div>'
  );
  image.addEventListener("click", () => {
    const popupCarouselIndicatorsButton = document.querySelectorAll(
      ".image-popup-overlay .carousel-indicators button"
    );
    const popupCarouselInnerItem = document.querySelectorAll(
      ".image-popup-overlay .carousel-inner .carousel-item"
    );
    // popupImage.src = image.src;
    popupOverlay.classList.add("active");
    document.querySelector("body").classList.add("no-scroll");
    popupCarouselInnerItem.forEach(function (e) {
      if (
        image.getAttribute("data-showcase-slide") ===
        e.querySelector("img").getAttribute("data-carousel-slide")
      ) {
        e.classList.add("active");
      }
    });
    popupCarouselIndicatorsButton.forEach(function (e) {
      if (
        image.getAttribute("data-showcase-slide") ===
        e.getAttribute("data-bs-slide-to")
      ) {
        e.classList.add("active");
        e.setAttribute("aria-current", "true");
      }
    });
  });
  temp++;
});

closeBtn.addEventListener("click", () => {
    const popupCarouselIndicatorsButton = document.querySelectorAll(
        ".image-popup-overlay .carousel-indicators button"
      );
      const popupCarouselInnerItem = document.querySelectorAll(
        ".image-popup-overlay .carousel-inner .carousel-item"
      );
  popupOverlay.classList.remove("active");
  document.querySelector("body").classList.remove("no-scroll");
  popupCarouselInnerItem.forEach(function (e) {
    if(e.classList.contains("active")) {
        e.classList.remove("active");
    }
  });
  popupCarouselIndicatorsButton.forEach(function (e) {
    if(e.classList.contains("active")) {
        e.classList.remove("active");
        e.setAttribute("aria-current", "");
    }
  });
});

// const carousel = new bootstrap.Carousel('#carouselExampleIndicators')

// popupOverlay.addEventListener("click", (e) => {
//   if (e.target === popupOverlay) {
//     popupOverlay.classList.remove("active");
//   }
// });
