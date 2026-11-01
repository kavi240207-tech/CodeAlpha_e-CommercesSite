/**
 * Shopping Cart Management Module
 */

const Cart = {
  items: [],
  promo: null,
  FREE_SHIPPING_THRESHOLD: 1999.00,

  init() {
    this.loadCart();
    this.bindEvents();
    this.render();
  },

  loadCart() {
    try {
      const stored = localStorage.getItem('lumen_cart');
      this.items = stored ? JSON.parse(stored) : [];
      const storedPromo = localStorage.getItem('lumen_promo');
      this.promo = storedPromo ? JSON.parse(storedPromo) : null;
    } catch (e) {
      this.items = [];
      this.promo = null;
    }
  },

  saveCart() {
    localStorage.setItem('lumen_cart', JSON.stringify(this.items));
    if (this.promo) {
      localStorage.setItem('lumen_promo', JSON.stringify(this.promo));
    } else {
      localStorage.removeItem('lumen_promo');
    }
    this.render();
  },

  bindEvents() {
    // Open Cart Drawer
    const cartTriggerBtn = document.getElementById('cartTriggerBtn');
    if (cartTriggerBtn) {
      cartTriggerBtn.addEventListener('click', () => this.openDrawer());
    }

    // Close Cart Drawer
    const cartCloseBtn = document.getElementById('cartCloseBtn');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartCloseBtn && cartOverlay) {
      cartCloseBtn.addEventListener('click', () => this.closeDrawer());
      cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) this.closeDrawer();
      });
    }

    // Promo Code Form
    const promoBtn = document.getElementById('promoApplyBtn');
    const promoInput = document.getElementById('promoCodeInput');
    if (promoBtn && promoInput) {
      promoBtn.addEventListener('click', () => this.applyPromo(promoInput.value));
      promoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.applyPromo(promoInput.value);
        }
      });
    }

    // Proceed to Checkout Button
    const proceedCheckoutBtn = document.getElementById('proceedCheckoutBtn');
    if (proceedCheckoutBtn) {
      proceedCheckoutBtn.addEventListener('click', () => {
        if (this.items.length === 0) {
          showToast('Your cart is empty!', 'error');
          return;
        }
        this.closeDrawer();
        window.App.openCheckoutModal();
      });
    }
  },

  openDrawer() {
    document.getElementById('cartOverlay').classList.add('active');
    document.getElementById('cartDrawer').classList.add('active');
  },

  closeDrawer() {
    document.getElementById('cartOverlay').classList.remove('active');
    document.getElementById('cartDrawer').classList.remove('active');
  },

  addItem(product, quantity = 1) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: quantity
      });
    }

    this.saveCart();
    this.openDrawer();
    showToast(`Added "${product.name}" to your cart!`, 'success');
  },

  updateQuantity(id, newQty) {
    if (newQty <= 0) {
      this.removeItem(id);
      return;
    }
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.quantity = newQty;
      this.saveCart();
    }
  },

  removeItem(id) {
    const item = this.items.find(item => item.id === id);
    const itemName = item ? item.name : 'Item';
    this.items = this.items.filter(item => item.id !== id);
    this.saveCart();
    showToast(`Removed "${itemName}" from cart.`, 'success');
  },

  clearCart() {
    this.items = [];
    this.promo = null;
    this.saveCart();
  },

  async applyPromo(code) {
    if (!code || !code.trim()) return;
    const subtotal = this.getSubtotal();
    const feedback = document.getElementById('promoFeedback');
    feedback.textContent = 'Validating promo...';
    feedback.className = 'promo-feedback';

    try {
      const data = await API.validatePromo(code, subtotal);
      this.promo = {
        code: data.code,
        ...data.promo
      };
      feedback.textContent = `Applied coupon: ${data.promo.desc}`;
      feedback.className = 'promo-feedback success';
      this.saveCart();
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = 'promo-feedback error';
    }
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getDiscount() {
    if (!this.promo) return 0;
    const subtotal = this.getSubtotal();
    if (this.promo.type === 'percent') {
      return (subtotal * this.promo.value) / 100;
    }
    if (this.promo.type === 'fixed' && subtotal >= (this.promo.minSubtotal || 0)) {
      return this.promo.value;
    }
    return 0;
  },

  getShippingFee() {
    if (this.items.length === 0) return 0;
    if (this.promo && this.promo.type === 'shipping') return 0;
    return this.getSubtotal() >= this.FREE_SHIPPING_THRESHOLD ? 0 : 99;
  },

  getTax() {
    return Math.round(this.getSubtotal() * 0.18); // 18% GST
  },

  getTotal() {
    const subtotal = this.getSubtotal();
    if (subtotal === 0) return 0;
    const discount = this.getDiscount();
    const shipping = this.getShippingFee();
    const tax = this.getTax();
    return Math.max(0, subtotal - discount + shipping + tax);
  },

  render() {
    // 1. Update Cart Badges
    const totalCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
      cartBadge.textContent = totalCount;
      cartBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
    }

    const drawerCount = document.getElementById('cartDrawerCount');
    if (drawerCount) {
      drawerCount.textContent = `(${totalCount})`;
    }

    // 2. Render Items
    const container = document.getElementById('cartItemsList');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-view">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
          <h4 style="color:#fff; margin-bottom: 6px;">Your cart is empty</h4>
          <p style="font-size: 0.88rem;">Explore our curated collection to add items.</p>
        </div>
      `;
    } else {
      container.innerHTML = this.items.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
          <div class="cart-item-info">
            <div>
              <div class="cart-item-title">${item.name}</div>
              <div class="cart-item-price">₹${Number(item.price).toLocaleString('en-IN')}</div>
            </div>
            <div class="cart-item-controls">
              <div class="quantity-stepper">
                <button class="stepper-btn" onclick="Cart.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                <span class="stepper-val">${item.quantity}</span>
                <button class="stepper-btn" onclick="Cart.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
              </div>
              <button class="cart-item-remove" onclick="Cart.removeItem(${item.id})" title="Remove item">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    // 3. Free shipping goal calculation
    const subtotal = this.getSubtotal();
    const progressFill = document.getElementById('shippingProgressFill');
    const progressText = document.getElementById('shippingProgressText');
    if (progressFill && progressText) {
      if (subtotal >= this.FREE_SHIPPING_THRESHOLD || (this.promo && this.promo.type === 'shipping')) {
        progressFill.style.width = '100%';
        progressText.innerHTML = '<span>🎉 You qualified for <strong>FREE Delivery!</strong></span>';
      } else {
        const remaining = (this.FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString('en-IN');
        const percent = Math.min(100, Math.round((subtotal / this.FREE_SHIPPING_THRESHOLD) * 100));
        progressFill.style.width = `${percent}%`;
        progressText.innerHTML = `<span>Add <strong>₹${remaining}</strong> more for Free Delivery</span><span>${percent}%</span>`;
      }
    }

    // 4. Update Summaries
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const shippingEl = document.getElementById('cartShipping');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.textContent = `₹${Math.round(subtotal).toLocaleString('en-IN')}`;
    if (discountEl) {
      const discount = this.getDiscount();
      discountEl.textContent = discount > 0 ? `-₹${Math.round(discount).toLocaleString('en-IN')}` : '₹0';
    }
    if (shippingEl) {
      const shipping = this.getShippingFee();
      shippingEl.textContent = shipping === 0 ? 'FREE' : `₹${shipping}`;
    }
    if (taxEl) taxEl.textContent = `₹${Math.round(this.getTax()).toLocaleString('en-IN')}`;
    if (totalEl) totalEl.textContent = `₹${Math.round(this.getTotal()).toLocaleString('en-IN')}`;
  }
};

window.Cart = Cart;
