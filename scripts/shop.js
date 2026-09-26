document.addEventListener("DOMContentLoaded", () => {
  const selects      = document.querySelectorAll(".shop-filter-select");
  const clearBtn     = document.getElementById("shop-filter-clear");
  const cards        = document.querySelectorAll(".shop-card");
  const emptyMessage = document.getElementById("shop-empty");
  const resultCount  = document.getElementById("shop-result-count");

  if (!cards.length) return;

  // Snapshot original options on load
  const originalOptions = new Map();
  selects.forEach(sel => {
    originalOptions.set(sel, Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent.trim() })));
  });

  function getActiveFilters() {
    const f = {};
    selects.forEach(sel => { f[sel.getAttribute("data-filter")] = sel.value; });
    return f;
  }

  // Cards that match all filters EXCEPT the one being excluded
  function getMatchingCards(excludeKey) {
    const f = getActiveFilters();
    return Array.from(cards).filter(card =>
      Object.entries(f).every(([key, val]) => {
        if (key === excludeKey || !val) return true;
        return card.getAttribute("data-" + key) === val;
      })
    );
  }

  function updateOptions() {
    selects.forEach(sel => {
      const key        = sel.getAttribute("data-filter");
      const currentVal = sel.value;
      const available  = new Set(
        getMatchingCards(key).map(c => c.getAttribute("data-" + key)).filter(v => v)
      );

      sel.innerHTML = "";
      originalOptions.get(sel).forEach(({ value, text }) => {
        if (value === "" || available.has(value)) {
          const opt       = document.createElement("option");
          opt.value       = value;
          opt.textContent = text;
          sel.appendChild(opt);
        }
      });

      sel.value = available.has(currentVal) ? currentVal : "";
    });
  }

  function applyFilters() {
    updateOptions();
    const f = getActiveFilters();

    let visible = 0;
    cards.forEach(card => {
      const match =
        (!f.category     || card.getAttribute("data-category")     === f.category) &&
        (!f.colour       || card.getAttribute("data-colour")       === f.colour) &&
        (!f.work         || card.getAttribute("data-work")         === f.work) &&
        (!f.availability || card.getAttribute("data-availability") === f.availability);
      card.style.display = match ? "" : "none";
      if (match) visible++;
    });

    if (emptyMessage) emptyMessage.style.display = visible === 0 ? "block" : "none";
    if (resultCount) resultCount.textContent = visible + (visible === 1 ? " saree" : " sarees");
    if (clearBtn) clearBtn.style.display = Array.from(selects).some(s => s.value) ? "" : "none";
  }

  if (clearBtn) clearBtn.style.display = "none";

  selects.forEach(sel => sel.addEventListener("change", applyFilters));

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      selects.forEach(sel => { sel.value = ""; });
      applyFilters();
    });
  }
});
