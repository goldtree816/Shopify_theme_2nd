(function () {
  function setStickyOffset(root) {
    if (!root || root.dataset.stickyFilterBar !== "true") return;

    const header = document.getElementById("site-header");
    if (!header) {
      root.style.setProperty("--aevi-collection-sticky-offset", "0px");
      return;
    }

    const headerRect = header.getBoundingClientRect();
    const offset = Math.max(0, headerRect.top + header.offsetHeight);
    root.style.setProperty("--aevi-collection-sticky-offset", offset + "px");
  }

  function initCollection(root) {
    if (!root || root.dataset.aeviCollectionInit === "true") return;
    root.dataset.aeviCollectionInit = "true";

    const overlay = root.querySelector("[data-collection-filter-overlay]");
    const drawer = root.querySelector("[data-collection-filter-drawer]");
    const openButtons = root.querySelectorAll("[data-open-filter-drawer]");
    const closeButtons = root.querySelectorAll("[data-close-filter-drawer]");
    const form = root.querySelector(".aevi-collection__drawer-form");
    const countTargets = root.querySelectorAll(".aevi-collection__filter-count");
    const autoApplySort = root.dataset.autoApplySort === "true";

    const openDrawer = function () {
      root.classList.add("is-filter-drawer-open");
      document.documentElement.classList.add("aevi-filter-open");
      if (drawer) drawer.setAttribute("aria-hidden", "false");
    };

    const closeDrawer = function () {
      root.classList.remove("is-filter-drawer-open");
      document.documentElement.classList.remove("aevi-filter-open");
      if (drawer) drawer.setAttribute("aria-hidden", "true");
    };

    openButtons.forEach(function (button) {
      button.addEventListener("click", openDrawer);
    });

    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeDrawer);
    });

    if (overlay) {
      overlay.addEventListener("click", closeDrawer);
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
    });

    function updateFilterCount() {
      if (!form) return;

      let count = 0;
      count += form.querySelectorAll('input[type="checkbox"]:checked').length;

      const priceInputs = form.querySelectorAll(".aevi-collection__price-range input");
      let hasPriceRange = false;
      priceInputs.forEach(function (input) {
        if (input.value && input.value.trim() !== "") hasPriceRange = true;
      });
      if (hasPriceRange) count += 1;

      countTargets.forEach(function (target) {
        if (count > 0) {
          target.hidden = false;
          target.textContent = "(" + count + ")";
        } else {
          target.hidden = true;
          target.textContent = "";
        }
      });
    }

    if (form) {
      form.addEventListener("change", function (event) {
        if (autoApplySort && event.target.matches('input[type="radio"][name="sort_by"]')) {
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
        updateFilterCount();
      });

      form.addEventListener("input", updateFilterCount);
      form.addEventListener("submit", closeDrawer);
      updateFilterCount();
    }

    setStickyOffset(root);
    window.addEventListener(
      "resize",
      function () {
        setStickyOffset(root);
      },
      { passive: true }
    );
    window.addEventListener(
      "scroll",
      function () {
        setStickyOffset(root);
      },
      { passive: true }
    );
  }

  function initAllCollections() {
    document.querySelectorAll(".aevi-collection").forEach(initCollection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllCollections);
  } else {
    initAllCollections();
  }

  document.addEventListener("shopify:section:load", function (event) {
    const root = event.target.querySelector(".aevi-collection");
    if (root) initCollection(root);
  });
})();
