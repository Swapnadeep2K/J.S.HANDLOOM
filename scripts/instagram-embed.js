const instagramRoot = document.querySelector(".insta-iframe");

if (instagramRoot) {
  const labelFrames = (root) => {
    root.querySelectorAll("iframe").forEach((frame) => {
      if (!frame.getAttribute("title")?.trim()) {
        frame.setAttribute("title", "Instagram post from J.S.HANDLOOM");
      }
    });
  };

  labelFrames(instagramRoot);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches("iframe")) labelFrames(node.parentElement || instagramRoot);
        else labelFrames(node);
      });
    });
  });
  observer.observe(instagramRoot, { childList: true, subtree: true });
}
