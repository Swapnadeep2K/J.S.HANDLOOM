document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const closeSidebarButton = document.getElementById("closeSidebarButton");
  
    // Open Sidebar
    mobileMenuButton.addEventListener("click", () => {
      sidebar.classList.add("open");
      overlay.classList.add("active");
      mobileMenuButton.setAttribute("aria-expanded", "true");
    });
  
    // Close Sidebar
    closeSidebarButton.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
      mobileMenuButton.setAttribute("aria-expanded", "false");
    });
  
    // Close Sidebar on Overlay Click
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
      mobileMenuButton.setAttribute("aria-expanded", "false");
    });
  });
  