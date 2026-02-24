(() => {
  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "area[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
    "iframe",
    "object",
    "embed",
    "[contenteditable]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  const drawerRegistry = new Map();
  let activeDrawer = null;
  let openCount = 0;
  const overlay = document.querySelector(".pageOverlay");
  const focusTraps = new WeakMap();

  const lockBodyScroll = () => {
    if (document.body.classList.contains("scrollLock")) return;
    const scrollY = window.scrollY || window.pageYOffset;
    document.body.dataset.scrollLockY = String(scrollY);
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add("scrollLock");
  };

  const unlockBodyScroll = () => {
    if (!document.body.classList.contains("scrollLock")) return;
    const scrollY = Number(document.body.dataset.scrollLockY || 0);
    document.body.classList.remove("scrollLock");
    document.body.style.top = "";
    delete document.body.dataset.scrollLockY;
    window.scrollTo(0, scrollY);
  };

  const trapFocus = (container) => {
    if (!container) return;
    if (focusTraps.has(container)) return;
    const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handler = (event) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", handler);
    focusTraps.set(container, handler);
    first.focus({ preventScroll: true });
  };

  const removeTrapFocus = (container) => {
    const handler = focusTraps.get(container);
    if (!handler) return;
    container.removeEventListener("keydown", handler);
    focusTraps.delete(container);
  };

  const setOverlayVisible = (visible) => {
    if (!overlay) return;
    overlay.classList.toggle("is-visible", visible);
    overlay.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  const closeActiveDrawer = () => {
    if (activeDrawer) {
      activeDrawer.closeDrawer();
    }
  };

  const handleGlobalClick = (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    const action = trigger.getAttribute("data-action");
    if (!action || !action.includes("drawer")) return;

    const drawerId = trigger.getAttribute("data-toggle-id");
    if (!drawerId) return;
    const drawer = drawerRegistry.get(drawerId);
    if (!drawer) return;

    event.preventDefault();
    if (action === "open-drawer") {
      drawer.openDrawer(trigger);
    } else if (action === "close-drawer") {
      drawer.closeDrawer();
    } else if (action === "toggle-drawer") {
      drawer.toggleDrawer(trigger);
    }
  };

  const handleGlobalKeydown = (event) => {
    if (event.key === "Escape") {
      closeActiveDrawer();
    }
  };

  const setWindowHeightVar = () => {
    document.documentElement.style.setProperty("--window-height", `${window.innerHeight}px`);
  };

  const handleGlobalResize = () => {
    setWindowHeightVar();
    drawerRegistry.forEach((drawer) => drawer.maxHeight());
  };

  if (overlay) {
    overlay.addEventListener("click", closeActiveDrawer);
  }
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("resize", handleGlobalResize);
  setWindowHeightVar();

  class Drawer {
    constructor(element, options = {}) {
      this.element = element;
      this.options = options;
      this.onOpen = options.onOpen || (() => {});
      this.onClose = options.onClose || (() => {});
      this.isOpen = false;
      drawerRegistry.set(this.element.id, this);
      this.element.dataset.drawerReady = "true";
      if (navigator.platform === "iPhone") {
        document.documentElement.style.setProperty("--viewport-height", `${window.innerHeight}px`);
      }
      this.maxHeight();
    }

    maxHeight() {
      this.element.style.height = `${window.innerHeight}px`;
      if (this.element.id === "cart-drawer") {
        const footer = this.element.querySelector(".cart-drawer__footer");
        const header = this.element.querySelector(".cart-drawer__header");
        if (footer) {
          document.documentElement.style.setProperty(
            "--cart-drawer__footer-height",
            `${footer.offsetHeight}px`
          );
        }
        if (header) {
          document.documentElement.style.setProperty(
            "--cart-drawer__header-height",
            `${header.offsetHeight}px`
          );
        }
        return;
      }

      const content = this.element.querySelector(".Drawer--Content");
      const headerHeight = this.element.querySelector(".Drawer--Header")?.offsetHeight || 0;
      const footerHeight = this.element.querySelector(".Drawer--Footer")?.offsetHeight || 0;
      if (content) {
        let maxHeight = window.innerHeight;
        if (this.element.id === "mobile-menu") {
          maxHeight = this.element.offsetHeight || maxHeight;
        }
        const contentHeight = maxHeight - headerHeight - footerHeight;
        content.style.height = `${contentHeight}px`;
      }
    }

    handleDynamicContent(trigger) {
      const sourceSelector = trigger?.dataset.drawerSource;
      if (!sourceSelector) return;
      const source = document.querySelector(sourceSelector);
      const content = this.element.querySelector("[data-drawer-content]");
      if (!source || !content) return;

      const title = this.element.querySelector("[data-drawer-title]");
      const drawerTitle = trigger.dataset.drawerTitle || "";
      if (title) title.textContent = drawerTitle;

      content.innerHTML = "";
      const clone = source.cloneNode(true);
      clone.removeAttribute("hidden");
      clone.querySelectorAll("[id]").forEach((node) => {
        node.setAttribute("id", `${node.getAttribute("id")}--drawer`);
      });
      clone.querySelectorAll("[for]").forEach((node) => {
        node.setAttribute("for", `${node.getAttribute("for")}--drawer`);
      });
      content.appendChild(clone);

      if (window.Shopify && Shopify.CountryProvinceSelector) {
        content.querySelectorAll("[data-address-country-select]").forEach((select) => {
          const form = select.closest("form");
          const province = form?.querySelector("[data-address-province-select]");
          const container = form?.querySelector("[id^='AddressProvinceContainer']");
          new Shopify.CountryProvinceSelector(
            select.id,
            province ? province.id : null,
            { hideElement: container ? container.id : null }
          );
        });
      }
    }

    openDrawer(trigger) {
      if (this.isOpen) return;
      drawerRegistry.forEach((drawer) => {
        if (drawer !== this && drawer.isOpen) {
          drawer.closeDrawer();
        }
      });

      if (this.element.id !== "mobile-menu") {
        setOverlayVisible(true);
      }

      openCount += 1;
      lockBodyScroll();

      this.handleDynamicContent(trigger);
      this.element.setAttribute("aria-hidden", "false");
      this.maxHeight();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.element.setAttribute("aria-expanded", "true");
        });
      });

      activeDrawer = this;
      this.isOpen = true;
      setTimeout(() => trapFocus(this.element), 50);
      this.onOpen(trigger);
    }

    closeDrawer() {
      if (!this.isOpen) return;
      this.element.setAttribute("aria-expanded", "false");
      removeTrapFocus(this.element);

      if (this.element.id !== "mobile-menu") {
        setOverlayVisible(false);
      }

      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) {
        unlockBodyScroll();
      }

      const transitionHandler = (event) => {
        if (this.element.id === "mobile-menu" && event.propertyName === "opacity") {
          this.element.setAttribute("aria-hidden", "true");
        } else if (this.element.id === "cart-drawer") {
          this.element.removeAttribute("aria-hidden");
        } else if (this.element.id === "Drawer") {
          this.element.setAttribute("aria-hidden", "true");
        }
        this.element.removeEventListener("transitionend", transitionHandler);
      };

      if (this.element.id === "mobile-menu" || this.element.id === "cart-drawer") {
        this.element.addEventListener("transitionend", transitionHandler);
      } else {
        this.element.setAttribute("aria-hidden", "true");
      }

      const content = this.element.querySelector("[data-drawer-content]");
      if (content) content.innerHTML = "";

      this.isOpen = false;
      if (activeDrawer === this) activeDrawer = null;
      this.onClose();
    }

    toggleDrawer(trigger) {
      if (this.isOpen) {
        this.closeDrawer();
      } else {
        this.openDrawer(trigger);
      }
    }
  }

  window.AeviDrawer = Drawer;

  class ProductCardDrawer extends HTMLElement {
    connectedCallback() {
      if (this.dataset.drawerReady === "true") return;
      this.drawer = new Drawer(this, {
        onOpen: (trigger) => {
          this.renderContent(trigger);
        },
        onClose: () => {
          this.clearContent();
        },
      });
      this.content = this.querySelector(".Drawer--Content");
    }

    clearContent() {
      if (this.content) this.content.innerHTML = "";
    }

    renderContent(trigger) {
      if (!trigger) return;
      const card = trigger.closest(".product-card");
      const purchaseOptions = card?.querySelector(".product-card__purchase-options");
      if (!this.content || !purchaseOptions) return;
      this.content.innerHTML = "";
      const clone = purchaseOptions.cloneNode(true);
      clone.querySelectorAll("[id]").forEach((node) => {
        node.setAttribute("id", `${node.getAttribute("id")}--mobile`);
      });
      clone.querySelectorAll("[for]").forEach((node) => {
        node.setAttribute("for", `${node.getAttribute("for")}--mobile`);
      });
      this.content.appendChild(clone);
    }
  }

  class MainMenuDropdown extends HTMLElement {
    connectedCallback() {
      if (this.dataset.drawerReady === "true") return;
      this.hamburger = document.querySelector(".header--hamburger");
      this.drawer = new Drawer(this, {
        onOpen: () => {
          this.hamburger?.classList.add("is-active");
          const mainGrid = this.querySelector(".mobile-menu__grid--level-one");
          if (mainGrid) {
            mainGrid.setAttribute("aria-hidden", "false");
            mainGrid.setAttribute("aria-expanded", "true");
          }
        },
        onClose: () => {
          this.hamburger?.classList.remove("is-active");
          this.querySelectorAll(".mobile-menu__grid").forEach((grid) => {
            grid.setAttribute("aria-expanded", "false");
            grid.setAttribute("aria-hidden", "true");
          });
        },
      });

      this.addEventListener("click", (event) => {
        const target = event.target.closest(
          "[data-action='open-submenu'], [data-action='close-submenu']"
        );
        if (!target) return;
        event.preventDefault();
        this.toggleSubmenu(target);
      });
    }

    toggleSubmenu(target) {
      const id = target.getAttribute("aria-controls");
      if (!id) return;
      const submenuToShow = this.querySelector(`#${id}`);
      const submenuToHide = this.querySelector(".mobile-menu__grid[aria-expanded='true']");

      if (submenuToShow) {
        submenuToShow.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            submenuToShow.setAttribute("aria-expanded", "true");
          });
        });
        trapFocus(submenuToShow);
      }

      if (submenuToHide && submenuToHide !== submenuToShow) {
        submenuToHide.setAttribute("aria-expanded", "false");
        setTimeout(() => {
          submenuToHide.setAttribute("aria-hidden", "true");
        }, 255);
      }
    }
  }

  if ("customElements" in window) {
    if (!customElements.get("product-card-drawer")) {
      customElements.define("product-card-drawer", ProductCardDrawer);
    }
    if (!customElements.get("main-menu-dropdown")) {
      customElements.define("main-menu-dropdown", MainMenuDropdown);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const genericDrawer = document.getElementById("Drawer");
    if (genericDrawer && !genericDrawer.dataset.drawerReady) {
      new Drawer(genericDrawer);
    }
  });
})();
