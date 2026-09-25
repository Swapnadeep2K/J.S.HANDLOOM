document.addEventListener("DOMContentLoaded", () => {
  const chips = document.querySelectorAll(".shop-filter-chip");
  const cards = document.querySelectorAll(".shop-card");
  const emptyMessage = document.getElementById("shop-empty");

  if (!chips.length || !cards.length) return;

  function applyFilter(category) {
    let visibleCount = 0;
    cards.forEach((card) => {
      const matches = category === "all" || card.getAttribute("data-category") === category;
      card.style.display = matches ? "" : "none";
      if (matches) visibleCount++;
    });
    emptyMessage.style.display = visibleCount === 0 ? "block" : "none";
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilter(chip.getAttribute("data-category-filter"));
    });
  });
});
