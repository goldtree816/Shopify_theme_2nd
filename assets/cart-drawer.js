(() => {
  const cartDrawer = document.getElementById("cart-drawer");
  if (!cartDrawer) return;

  const isPageMode = cartDrawer.dataset.mode === "page";
  const itemsContainer = cartDrawer.querySelector("[data-cart-items]");
  const emptyContent = cartDrawer.querySelector("[data-cart-content-empty]");
  const fullContent = cartDrawer.querySelector("[data-cart-content-full]");
  const cartForm = cartDrawer.querySelector("[data-cart-form]");
  const footer = cartDrawer.querySelector("[data-cart-footer]");
  const subtotalEl = cartDrawer.querySelector("[data-cart-subtotal]");
  const checkoutEl = cartDrawer.querySelector("[data-cart-checkout-amount]");
  const loader = cartDrawer.querySelector(".itemLoader");

  if (!isPageMode) {
    cartDrawer.setAttribute("aria-expanded", "false");
    cartDrawer.setAttribute("aria-hidden", "true");
  }

  let drawerInstance = null;
  if (!isPageMode && window.AeviDrawer && !cartDrawer.dataset.drawerReady) {
    drawerInstance = new window.AeviDrawer(cartDrawer, {
      onOpen: () => {
        refreshCart();
      },
    });
  }

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatMoney = (cents) => {
    if (window.Shopify && typeof window.Shopify.formatMoney === "function") {
      const format = window.theme?.moneyFormat || window.Shopify.money_format;
      return window.Shopify.formatMoney(cents, format);
    }
    const value = (Number(cents || 0) / 100).toFixed(2);
    return `$${value}`;
  };

  const setLoading = (isLoading) => {
    if (!loader) return;
    loader.classList.toggle("is-visible", isLoading);
  };

  const renderCart = (cart) => {
    if (!cart) return;
    const isEmpty = cart.item_count === 0;

    if (emptyContent) emptyContent.toggleAttribute("hidden", !isEmpty);
    if (cartForm) cartForm.toggleAttribute("hidden", isEmpty);
    if (footer) footer.toggleAttribute("hidden", isEmpty);

    if (!itemsContainer) return;
    itemsContainer.innerHTML = "";

    if (isEmpty) {
      if (subtotalEl) subtotalEl.textContent = formatMoney(0);
      if (checkoutEl) checkoutEl.textContent = formatMoney(0);
      return;
    }

    cart.items.forEach((item, index) => {
      const line = index + 1;
      const variantId = item.variant_id || item.id;
      const variantTitle = item.variant_title && item.variant_title !== "Default Title"
        ? `<span class="u-p3">${escapeHtml(item.variant_title)}</span>`
        : "";
      const properties = item.properties
        ? Object.entries(item.properties)
            .filter(([, value]) => value)
            .map(
              ([key, value]) =>
                `<span class="u-p3">${escapeHtml(key)}: ${escapeHtml(value)}</span>`
            )
            .join("")
        : "";
      const sellingPlan = item.selling_plan_allocation
        ? `<span class="cart-item__subscription u-p3">${escapeHtml(
            item.selling_plan_allocation.selling_plan.name
          )}</span>`
        : "";

      const imageHtml = item.image
        ? `<a href="${escapeHtml(item.url)}" class="cart-item__details">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.product_title)}" loading="lazy">
          </a>`
        : "";

      const compareHtml =
        item.original_line_price > item.final_line_price
          ? `<span class="cart-item__price--before">${formatMoney(
              item.original_line_price
            )}</span>`
          : "";

      const markup = `
        <div class="cart-item" id="cart-item__${variantId}" data-id="${variantId}" data-line="${line}">
          <div class="cart-item__image AspectRatio">
            ${imageHtml}
          </div>
          <div class="cart-item__info">
            <div class="cart-item__info-header">
              <div class="cart-item__header-wrapper">
                <div class="cart-item__details">
                  <a href="${escapeHtml(item.url)}" class="u-s4">${escapeHtml(item.product_title)}</a>
                </div>
                <a href="#" data-action="remove-item" data-line="${line}" aria-label="Remove">
                  <svg class="Svg Svg--window-close" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M4.11451 4.11343C4.26718 3.96219 4.51472 3.96219 4.6674 4.11343L10.0569 9.45231L15.3326 4.22626C15.4853 4.07502 15.7328 4.07502 15.8855 4.22626C16.0382 4.3775 16.0382 4.62271 15.8855 4.77395L10.6098 10L15.8855 15.226C16.0382 15.3773 16.0382 15.6225 15.8855 15.7737C15.7328 15.925 15.4853 15.925 15.3326 15.7737L10.0569 10.5477L4.6674 15.8866C4.51472 16.0378 4.26718 16.0378 4.11451 15.8866C3.96183 15.7353 3.96183 15.4901 4.11451 15.3389L9.50406 10L4.11451 4.66112C3.96183 4.50988 3.96183 4.26467 4.11451 4.11343Z"
                      fill="#231F20" />
                  </svg>
                </a>
              </div>
              <div class="cart-item__option-wrapper">
                ${variantTitle}
                ${properties}
                ${sellingPlan}
              </div>
            </div>
            <div class="cart-item__footer">
              <div class="cart-item__footer-wrapper">
                <div class="cart-item__quantity-selector">
                  <button class="cart-item__quantity-button" type="button" data-action="update-item-quantity" data-line="${line}" data-quantity="${item.quantity - 1}" aria-label="Decrease quantity">-</button>
                  <input class="cart-item__quantity" type="text" readonly value="${item.quantity}" data-action="update-change-quantity" data-line="${line}">
                  <button class="cart-item__quantity-button" type="button" data-action="update-item-quantity" data-line="${line}" data-quantity="${item.quantity + 1}" aria-label="Increase quantity">+</button>
                </div>
                <div class="cart-item__price">
                  ${compareHtml}
                  <span class="cart-item__price--discounted">${formatMoney(item.final_line_price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      itemsContainer.insertAdjacentHTML("beforeend", markup);
    });

    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    if (checkoutEl) checkoutEl.textContent = formatMoney(cart.total_price);
  };

  const updateLine = (line, quantity) => {
    setLoading(true);
    return fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line, quantity }),
    })
      .then((res) => res.json())
      .then((cart) => {
        renderCart(cart);
        return cart;
      })
      .catch((err) => console.error("Cart update error:", err))
      .finally(() => setLoading(false));
  };

  const refreshCart = () => {
    setLoading(true);
    return fetch("/cart.js")
      .then((res) => res.json())
      .then((cart) => {
        renderCart(cart);
        return cart;
      })
      .catch((err) => console.error("Cart fetch error:", err))
      .finally(() => setLoading(false));
  };

  cartDrawer.addEventListener("click", (event) => {
    const updateBtn = event.target.closest('[data-action="update-item-quantity"]');
    if (updateBtn) {
      event.preventDefault();
      const line = Number(updateBtn.dataset.line);
      const quantity = Number(updateBtn.dataset.quantity);
      if (!line || Number.isNaN(quantity) || quantity < 0) return;
      updateLine(line, quantity);
      return;
    }

    const removeBtn = event.target.closest('[data-action="remove-item"]');
    if (removeBtn) {
      event.preventDefault();
      const line = Number(removeBtn.dataset.line);
      if (!line) return;
      updateLine(line, 0);
    }
  });

  cartDrawer.addEventListener("change", (event) => {
    const qtyInput = event.target.closest('[data-action="update-change-quantity"]');
    if (!qtyInput) return;
    const line = Number(qtyInput.dataset.line);
    const quantity = Math.max(0, Math.round(Number(qtyInput.value)));
    if (!line || Number.isNaN(quantity)) return;
    updateLine(line, quantity);
  });

  document.addEventListener("cart:updated", () => {
    if (!isPageMode && drawerInstance) {
      drawerInstance.openDrawer();
    }
    refreshCart();
  });

  refreshCart();
})();
