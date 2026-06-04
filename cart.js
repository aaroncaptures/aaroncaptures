/*
  Aaron Captures Cart
  File path: /assets/cart.js

  Purpose:
  - Stores fine art print cart items in localStorage.
  - Creates an accessible cart drawer UI.
  - Supports quantity changes, removing items, subtotal updates, and cart status messages.
  - Prepares the frontend for a future Cloudflare Worker + Stripe Checkout connection.

  Important:
  - Do not place Stripe secret keys in this file.
  - Final checkout pricing must be verified server-side in the Cloudflare Worker.
*/

(function () {
  "use strict";

  const CART_STORAGE_KEY = "aaronCapturesPrintCart";
  const CART_UPDATED_EVENT = "aaron-cart-updated";

  /*
    Phase 2B placeholder:
    When the Cloudflare Worker is ready, replace this with your Worker endpoint.

    Example:
    const CHECKOUT_ENDPOINT = "https://aaron-captures-checkout.rashid-aaron.workers.dev/create-checkout-session";
  */
  const CHECKOUT_ENDPOINT = "https://aaron-captures-checkout.rashid-aaron.workers.dev/create-checkout-session";

  const selectors = {
    drawer: "ac-cart-drawer",
    overlay: "ac-cart-overlay",
    panel: "ac-cart-panel",
    openButton: "ac-cart-open",
    closeButton: "ac-cart-close",
    items: "ac-cart-items",
    subtotal: "ac-cart-subtotal",
    count: "ac-cart-count",
    status: "ac-cart-status",
    checkoutButton: "ac-cart-checkout"
  };

  let previouslyFocusedElement = null;

  function formatMoney(value) {
    return `$${Number(value || 0).toLocaleString()}`;
  }

  function generateCartItemId(item) {
    return [
      item.slug,
      item.size,
      item.finish
    ].map(value => String(value || "").toLowerCase().replace(/\s+/g, "-")).join("__");
  }

  function readCart() {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];

      if (!Array.isArray(parsedCart)) return [];

      return parsedCart
        .filter(item => item && item.slug && item.title && item.size && item.finish)
        .map(item => ({
          id: item.id || generateCartItemId(item),
          slug: item.slug,
          title: item.title,
          collection: item.collection || "",
          image: item.image || "",
          size: item.size,
          edition: Number(item.edition || 0),
          finish: item.finish,
          basePrice: Number(item.basePrice || 0),
          frameAddOn: Number(item.frameAddOn || 0),
          unitPrice: Number(item.unitPrice || 0),
          quantity: Math.max(1, Number(item.quantity || 1))
        }));
    } catch (error) {
      console.warn("Unable to read Aaron Captures cart.", error);
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { cart } }));
  }

  function getCartSubtotal(cart = readCart()) {
    return cart.reduce((subtotal, item) => {
      return subtotal + Number(item.unitPrice || 0) * Number(item.quantity || 1);
    }, 0);
  }

  function getCartCount(cart = readCart()) {
    return cart.reduce((count, item) => count + Number(item.quantity || 1), 0);
  }

  function announce(message) {
    const status = document.getElementById(selectors.status);
    if (status) status.textContent = message;
  }

  function addItem(item) {
    const cart = readCart();
    const normalizedItem = {
      id: generateCartItemId(item),
      slug: item.slug,
      title: item.title,
      collection: item.collection || "",
      image: item.image || "",
      size: item.size,
      edition: Number(item.edition || 0),
      finish: item.finish,
      basePrice: Number(item.basePrice || 0),
      frameAddOn: Number(item.frameAddOn || 0),
      unitPrice: Number(item.unitPrice || 0),
      quantity: Math.max(1, Number(item.quantity || 1))
    };

    const existingItem = cart.find(cartItem => cartItem.id === normalizedItem.id);

    if (existingItem) {
      existingItem.quantity += normalizedItem.quantity;
    } else {
      cart.push(normalizedItem);
    }

    saveCart(cart);
    renderCart();
    openCart();

    announce(`${normalizedItem.title} was added to your cart.`);
  }

  function removeItem(itemId) {
    const cart = readCart();
    const itemToRemove = cart.find(item => item.id === itemId);
    const updatedCart = cart.filter(item => item.id !== itemId);

    saveCart(updatedCart);
    renderCart();

    if (itemToRemove) {
      announce(`${itemToRemove.title} was removed from your cart.`);
    }
  }

  function updateQuantity(itemId, quantity) {
    const cart = readCart();
    const safeQuantity = Math.max(1, Number(quantity || 1));

    const updatedCart = cart.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, quantity: safeQuantity };
    });

    saveCart(updatedCart);
    renderCart();
    announce("Cart quantity updated.");
  }

  function clearCart() {
    saveCart([]);
    renderCart();
    announce("Cart cleared.");
  }

  function createCartShell() {
    if (document.getElementById(selectors.drawer)) return;

    const drawer = document.createElement("div");
    drawer.id = selectors.drawer;
    drawer.className = "cart-drawer";
    drawer.hidden = true;

    drawer.innerHTML = `
      <div id="${selectors.overlay}" class="cart-drawer-overlay" tabindex="-1"></div>

      <aside
        id="${selectors.panel}"
        class="cart-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartDrawerTitle"
        aria-describedby="${selectors.status}"
      >
        <div class="cart-drawer-header">
          <div>
            <p class="cart-eyebrow">Collector Cart</p>
            <h2 id="cartDrawerTitle">Your Prints</h2>
          </div>

          <button id="${selectors.closeButton}" class="cart-close-button" type="button" aria-label="Close cart">
            ×
          </button>
        </div>

        <p id="${selectors.status}" class="sr-only" aria-live="polite"></p>

        <div id="${selectors.items}" class="cart-items"></div>

        <div class="cart-drawer-footer">
          <div class="cart-subtotal-row">
            <span>Subtotal</span>
            <strong id="${selectors.subtotal}">$0</strong>
          </div>

          <p class="cart-note">
            Shipping, taxes, and final fulfillment details are calculated during checkout.
          </p>

          <button id="${selectors.checkoutButton}" class="btn-primary cart-checkout-button" type="button">
            Checkout
          </button>

          <p class="cart-checkout-note">
            Secure checkout will open through Stripe.
          </p>
        </div>
      </aside>
    `;

    document.body.appendChild(drawer);

    const overlay = document.getElementById(selectors.overlay);
    const closeButton = document.getElementById(selectors.closeButton);
    const checkoutButton = document.getElementById(selectors.checkoutButton);

    overlay.addEventListener("click", closeCart);
    closeButton.addEventListener("click", closeCart);
    checkoutButton.addEventListener("click", startCheckout);

    drawer.addEventListener("keydown", handleDrawerKeydown);
  }

  function createHeaderCartButton() {
    if (document.getElementById(selectors.openButton)) return;

    const navMenu = document.querySelector(".nav-menu");
    if (!navMenu) return;

    const button = document.createElement("button");
    button.id = selectors.openButton;
    button.className = "cart-open-button";
    button.type = "button";
    button.setAttribute("aria-label", "Open cart");
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML = `Cart <span id="${selectors.count}" class="cart-count" aria-hidden="true">0</span>`;

    button.addEventListener("click", openCart);
    navMenu.appendChild(button);
  }

  function renderCart() {
    createCartShell();
    createHeaderCartButton();

    const cart = readCart();
    const itemsContainer = document.getElementById(selectors.items);
    const subtotalElement = document.getElementById(selectors.subtotal);
    const countElement = document.getElementById(selectors.count);
    const checkoutButton = document.getElementById(selectors.checkoutButton);

    if (!itemsContainer || !subtotalElement) return;

    itemsContainer.innerHTML = "";

    if (cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty">
          <p>Your cart is empty.</p>
          <p>Choose a print, select a size and finish, then add it here.</p>
        </div>
      `;
    } else {
      cart.forEach(item => {
        itemsContainer.appendChild(createCartItemElement(item));
      });
    }

    const subtotal = getCartSubtotal(cart);
    const count = getCartCount(cart);

    subtotalElement.textContent = formatMoney(subtotal);

    if (countElement) {
      countElement.textContent = String(count);
    }

    if (checkoutButton) {
      checkoutButton.disabled = cart.length === 0;
      checkoutButton.textContent = cart.length === 0 ? "Cart is Empty" : "Checkout";
    }
  }

  function createCartItemElement(item) {
    const itemElement = document.createElement("article");
    itemElement.className = "cart-item";

    const imageMarkup = item.image
      ? `<img src="${escapeAttribute(item.image)}" alt="" loading="lazy" decoding="async">`
      : "";

    itemElement.innerHTML = `
      <div class="cart-item-image" aria-hidden="true">
        ${imageMarkup}
      </div>

      <div class="cart-item-details">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.collection)}</p>
        <p>${escapeHtml(item.size)} · Edition of ${escapeHtml(item.edition)} · ${escapeHtml(item.finish)}</p>
        <p>${formatMoney(item.unitPrice)} each</p>

        <div class="cart-item-actions">
          <label>
            <span class="sr-only">Quantity for ${escapeHtml(item.title)}</span>
            <input
              class="cart-quantity-input"
              type="number"
              min="1"
              step="1"
              value="${Number(item.quantity || 1)}"
              data-cart-quantity="${escapeAttribute(item.id)}"
              aria-label="Quantity for ${escapeAttribute(item.title)}"
            >
          </label>

          <button
            class="cart-remove-button"
            type="button"
            data-cart-remove="${escapeAttribute(item.id)}"
          >
            Remove
          </button>
        </div>
      </div>
    `;

    const quantityInput = itemElement.querySelector("[data-cart-quantity]");
    const removeButton = itemElement.querySelector("[data-cart-remove]");

    quantityInput.addEventListener("change", event => {
      updateQuantity(item.id, event.target.value);
    });

    removeButton.addEventListener("click", () => {
      removeItem(item.id);
    });

    return itemElement;
  }

  async function startCheckout() {
    const cart = readCart();

    if (cart.length === 0) {
      announce("Your cart is empty.");
      return;
    }

    if (!CHECKOUT_ENDPOINT) {
      announce("Checkout is not connected yet.");
      alert("Checkout is not connected yet. Next we will connect this cart to Stripe through a Cloudflare Worker.");
      return;
    }

    try {
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ items: cart })
      });

      if (!response.ok) {
        throw new Error("Checkout request failed.");
      }

      const data = await response.json();

      if (!data.url) {
        throw new Error("Stripe Checkout URL missing.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      announce("Checkout could not be started.");
      alert("Checkout could not be started. Please try again or contact Aaron directly.");
    }
  }

  function openCart() {
    createCartShell();

    const drawer = document.getElementById(selectors.drawer);
    const panel = document.getElementById(selectors.panel);
    const closeButton = document.getElementById(selectors.closeButton);

    if (!drawer || !panel) return;

    previouslyFocusedElement = document.activeElement;

    drawer.hidden = false;
    document.documentElement.classList.add("cart-is-open");
    document.body.classList.add("cart-is-open");

    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      closeButton.focus();
    });
  }

  function closeCart() {
    const drawer = document.getElementById(selectors.drawer);
    if (!drawer) return;

    drawer.classList.remove("is-open");
    document.documentElement.classList.remove("cart-is-open");
    document.body.classList.remove("cart-is-open");

    window.setTimeout(() => {
      drawer.hidden = true;

      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
        previouslyFocusedElement.focus();
      }
    }, 180);
  }

  function handleDrawerKeydown(event) {
    if (event.key === "Escape") {
      closeCart();
      return;
    }

    if (event.key !== "Tab") return;

    const drawer = document.getElementById(selectors.drawer);
    if (!drawer || drawer.hidden) return;

    const focusableElements = drawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const focusable = Array.from(focusableElements);
    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  document.addEventListener("DOMContentLoaded", () => {
    createHeaderCartButton();
    createCartShell();
    renderCart();
  });

  document.addEventListener(CART_UPDATED_EVENT, () => {
    renderCart();
  });

  window.AaronCart = {
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    readCart,
    getCartSubtotal,
    getCartCount,
    openCart,
    closeCart,
    renderCart,
    CART_UPDATED_EVENT
  };
})();
