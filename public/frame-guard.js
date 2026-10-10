(function () {
  if (window.top === window.self) return;
  try {
    window.top.location.replace(window.self.location.href);
  } catch (error) {
    document.documentElement.replaceChildren();
  }
})();
