document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuButton = document.getElementById("mobileMenuButton");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const closeSidebarButton = document.getElementById("closeSidebarButton");
  const desktopQuery =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 769px)")
      : null;

  if (!mobileMenuButton || !sidebar || !overlay || !closeSidebarButton) return;

  let isOpen = false;
  const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function setOpen(open, restoreFocus = false) {
    if (isOpen === open) return;

    isOpen = open;
    sidebar.classList.toggle("open", open);
    overlay.classList.toggle("active", open);
    sidebar.inert = !open;
    sidebar.setAttribute("aria-hidden", String(!open));
    mobileMenuButton.setAttribute("aria-expanded", String(open));

    if (open) {
      closeSidebarButton.focus();
    } else if (restoreFocus && !desktopQuery?.matches) {
      mobileMenuButton.focus();
    }
  }

  if (desktopQuery) {
    const closeOnDesktop = event => {
      if (event.matches) setOpen(false);
    };

    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", closeOnDesktop);
    } else {
      desktopQuery.addListener(closeOnDesktop);
    }
  }

  mobileMenuButton.addEventListener("click", () => setOpen(true));
  closeSidebarButton.addEventListener("click", () => setOpen(false, true));
  overlay.addEventListener("click", () => setOpen(false, true));

  sidebar.addEventListener("click", event => {
    if (event.target.closest("a[href]")) setOpen(false, true);
  });

  document.addEventListener("keydown", event => {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false, true);
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      sidebar.querySelectorAll(focusableSelector)
    ).filter(element => !element.hasAttribute("disabled"));
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (!first) {
      event.preventDefault();
      sidebar.focus();
    } else if (
      event.shiftKey &&
      (document.activeElement === first || !sidebar.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !sidebar.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  });
});
