/**
 * Lumen & Co. Main Storefront Application
 */

// Toast notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      ${type === 'success' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
        : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />'
      }
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

const App = {
  currentCategory: 'All',
  currentSearch: '',
  currentSort: 'featured',
  activeProduct: null,
  activeDetailQty: 1,

  async init() {
    this.bindEvents();
    await this.loadProducts();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentSearch = e.target.value;
          this.loadProducts();
        }, 300);
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.loadProducts();
      });
    }

    // Category pills
    const categoryContainer = document.getElementById('categoryPills');
    if (categoryContainer) {
      categoryContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (!pill) return;
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentCategory = pill.dataset.category;
        this.loadProducts();
      });
    }

    // Product Modal Close
    const productModalClose = document.getElementById('productModalClose');
    const productOverlay = document.getElementById('productOverlay');
    if (productModalClose && productOverlay) {
      productModalClose.addEventListener('click', () => this.closeProductModal());
      productOverlay.addEventListener('click', (e) => {
        if (e.target === productOverlay) this.closeProductModal();
      });
    }

    // Product Modal Detail Tabs
    const tabSpecs = document.getElementById('tabSpecs');
    const tabReviews = document.getElementById('tabReviews');
    if (tabSpecs && tabReviews) {
      tabSpecs.addEventListener('click', () => this.switchProductTab('specs'));
      tabReviews.addEventListener('click', () => this.switchProductTab('reviews'));
    }

    // Review Form Submission
    const reviewForm = document.getElementById('addReviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', (e) => this.handleReviewSubmit(e));
    }

    // Detail Modal Quantity Stepper
    const qtyMinus = document.getElementById('detailQtyMinus');
    const qtyPlus = document.getElementById('detailQtyPlus');
    const qtySpan = document.getElementById('detailQtyVal');
    if (qtyMinus && qtyPlus && qtySpan) {
      qtyMinus.addEventListener('click', () => {
        if (this.activeDetailQty > 1) {
          this.activeDetailQty--;
          qtySpan.textContent = this.activeDetailQty;
        }
      });
      qtyPlus.addEventListener('click', () => {
        if (this.activeDetailQty < (this.activeProduct?.stock || 99)) {
          this.activeDetailQty++;
          qtySpan.textContent = this.activeDetailQty;
        }
      });
    }

    // Detail Add to Cart Button
    const detailAddToCartBtn = document.getElementById('detailAddToCartBtn');
    if (detailAddToCartBtn) {
      detailAddToCartBtn.addEventListener('click', () => {
        if (this.activeProduct) {
          window.Cart.addItem(this.activeProduct, this.activeDetailQty);
        }
      });
    }

    // Detail Buy Now Button
    const detailBuyNowBtn = document.getElementById('detailBuyNowBtn');
    if (detailBuyNowBtn) {
      detailBuyNowBtn.addEventListener('click', () => {
        if (this.activeProduct) {
          window.Cart.addItem(this.activeProduct, this.activeDetailQty);
          this.closeProductModal();
          this.openCheckoutModal();
        }
      });
    }

    // Checkout Modal Close
    const checkoutModalClose = document.getElementById('checkoutModalClose');
    const checkoutOverlay = document.getElementById('checkoutOverlay');
    if (checkoutModalClose && checkoutOverlay) {
      checkoutModalClose.addEventListener('click', () => checkoutOverlay.classList.remove('active'));
      checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutOverlay) checkoutOverlay.classList.remove('active');
      });
    }

    // Checkout Form Submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
    }

    // Order Success Modal Close
    const successModalClose = document.getElementById('successModalClose');
    const successContinueBtn = document.getElementById('successContinueBtn');
    const successOverlay = document.getElementById('successOverlay');
    if (successModalClose && successOverlay) {
      successModalClose.addEventListener('click', () => successOverlay.classList.remove('active'));
    }
    if (successContinueBtn && successOverlay) {
      successContinueBtn.addEventListener('click', () => successOverlay.classList.remove('active'));
    }
    const successViewOrdersBtn = document.getElementById('successViewOrdersBtn');
    if (successViewOrdersBtn && successOverlay) {
      successViewOrdersBtn.addEventListener('click', () => {
        successOverlay.classList.remove('active');
        window.Auth.openOrdersModal();
      });
    }
  },

  async loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="empty-products">
        <p>Loading curated products...</p>
      </div>
    `;

    try {
      const data = await API.getProducts({
        category: this.currentCategory,
        search: this.currentSearch,
        sortBy: this.currentSort
      });

      if (!data.products || data.products.length === 0) {
        grid.innerHTML = `
          <div class="empty-products">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
            <h3 style="margin-bottom: 8px;">No matching products</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Try adjusting your filters or search keywords.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = data.products.map(p => this.renderProductCard(p)).join('');
    } catch (err) {
      grid.innerHTML = `<div class="empty-products"><p style="color:var(--danger)">Error: ${err.message}</p></div>`;
    }
  },

  renderProductCard(product) {
    const badgeClass = {
      'Sale': 'badge-sale',
      'Best Seller': 'badge-bestseller',
      'Trending': 'badge-trending',
      'New': 'badge-new',
      'Staff Pick': 'badge-staffpick'
    }[product.badge] || 'badge-trending';

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image-container" onclick="App.openProductModal(${product.id})">
          ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
          <img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" />
          <div class="quick-view-overlay">
            <button class="quick-view-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Quick Details
            </button>
          </div>
        </div>
        <div class="product-body">
          <div class="product-category-row">
            <span class="product-cat-name">${product.category}</span>
            <div class="product-rating">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span>${product.rating}</span>
              <span class="product-reviews-count">(${product.reviews_count})</span>
            </div>
          </div>
          <h3 class="product-title" onclick="App.openProductModal(${product.id})">${product.name}</h3>
          <p class="product-desc">${product.description}</p>
          <div class="product-footer">
            <div class="product-price-wrapper">
              <span class="product-price">$${product.price.toFixed(2)}</span>
              ${product.original_price ? `<span class="product-original-price">$${product.original_price.toFixed(2)}</span>` : ''}
            </div>
            <button class="btn-add-to-cart" onclick="App.quickAddToCart(event, ${product.id})" title="Add to Cart">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async quickAddToCart(event, productId) {
    event.stopPropagation();
    try {
      const product = await API.getProduct(productId);
      window.Cart.addItem(product, 1);
    } catch (e) {
      showToast('Could not add item to cart', 'error');
    }
  },

  async openProductModal(productId) {
    const overlay = document.getElementById('productOverlay');
    overlay.classList.add('active');
    this.activeDetailQty = 1;
    document.getElementById('detailQtyVal').textContent = '1';

    try {
      const product = await API.getProduct(productId);
      this.activeProduct = product;

      // Populate details
      document.getElementById('detailCategory').textContent = product.category;
      document.getElementById('detailTitle').textContent = product.name;
      document.getElementById('detailPrice').textContent = `$${product.price.toFixed(2)}`;
      
      const origPriceEl = document.getElementById('detailOrigPrice');
      const saveBadgeEl = document.getElementById('detailSaveBadge');
      if (product.original_price) {
        origPriceEl.textContent = `$${product.original_price.toFixed(2)}`;
        origPriceEl.style.display = 'inline';
        const savings = Math.round(((product.original_price - product.price) / product.original_price) * 100);
        saveBadgeEl.textContent = `Save ${savings}%`;
        saveBadgeEl.style.display = 'inline-block';
      } else {
        origPriceEl.style.display = 'none';
        saveBadgeEl.style.display = 'none';
      }

      document.getElementById('detailRatingNum').textContent = product.rating;
      document.getElementById('detailReviewsCount').textContent = `(${product.reviews_count} verified reviews)`;
      document.getElementById('detailDescription').textContent = product.description;

      // Stock
      const stockEl = document.getElementById('detailStockText');
      stockEl.textContent = product.stock > 5 ? `In Stock (${product.stock} available)` : `Low Stock: Only ${product.stock} left!`;

      // Features
      const featuresContainer = document.getElementById('detailFeaturesList');
      featuresContainer.innerHTML = (product.features || []).map(f => `
        <li>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          <span>${f}</span>
        </li>
      `).join('');

      // Gallery
      const mainImg = document.getElementById('detailMainImage');
      mainImg.src = product.image;

      const thumbRow = document.getElementById('detailThumbnailRow');
      thumbRow.innerHTML = (product.gallery || [product.image]).map((imgUrl, idx) => `
        <img class="thumb-img ${idx === 0 ? 'active' : ''}" src="${imgUrl}" alt="${product.name}" onclick="App.switchDetailImage(this, '${imgUrl}')" />
      `).join('');

      // Specs
      const specsContainer = document.getElementById('detailSpecsGrid');
      specsContainer.innerHTML = Object.entries(product.specs || {}).map(([k, v]) => `
        <div class="spec-item">
          <span class="spec-key">${k}</span>
          <span class="spec-val">${v}</span>
        </div>
      `).join('');

      // Reviews
      this.renderReviewsList(product.reviews || []);
    } catch (err) {
      showToast('Failed to load product details', 'error');
    }
  },

  switchDetailImage(thumbEl, url) {
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
    document.getElementById('detailMainImage').src = url;
  },

  switchProductTab(tab) {
    const tabSpecs = document.getElementById('tabSpecs');
    const tabReviews = document.getElementById('tabReviews');
    const paneSpecs = document.getElementById('tabPaneSpecs');
    const paneReviews = document.getElementById('tabPaneReviews');

    if (tab === 'specs') {
      tabSpecs.classList.add('active');
      tabReviews.classList.remove('active');
      paneSpecs.classList.add('active');
      paneReviews.classList.remove('active');
    } else {
      tabSpecs.classList.remove('active');
      tabReviews.classList.add('active');
      paneSpecs.classList.remove('active');
      paneReviews.classList.add('active');
    }
  },

  renderReviewsList(reviews) {
    const container = document.getElementById('detailReviewsContainer');
    if (!reviews || reviews.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No reviews yet. Be the first to share your thoughts!</p>';
      return;
    }

    container.innerHTML = reviews.map(r => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${r.user_name} ${r.verified ? '<span class="review-verified">✓ Verified Buyer</span>' : ''}</span>
          <div class="product-rating">
            <span>★</span> ${r.rating}.0
          </div>
        </div>
        ${r.title ? `<div class="review-title">${r.title}</div>` : ''}
        <div class="review-comment">${r.comment}</div>
      </div>
    `).join('');
  },

  async handleReviewSubmit(e) {
    e.preventDefault();
    if (!this.activeProduct) return;

    const name = document.getElementById('reviewAuthorName').value;
    const rating = document.getElementById('reviewRatingSelect').value;
    const title = document.getElementById('reviewTitle').value;
    const comment = document.getElementById('reviewComment').value;

    try {
      await API.submitReview(this.activeProduct.id, {
        user_name: name,
        rating,
        title,
        comment
      });

      showToast('Thank you! Your review has been submitted.', 'success');
      e.target.reset();
      // Reload product details to update reviews
      const updated = await API.getProduct(this.activeProduct.id);
      this.activeProduct = updated;
      this.renderReviewsList(updated.reviews);
      document.getElementById('detailRatingNum').textContent = updated.rating;
      document.getElementById('detailReviewsCount').textContent = `(${updated.reviews_count} verified reviews)`;
      this.loadProducts(); // update in grid too
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  closeProductModal() {
    document.getElementById('productOverlay').classList.remove('active');
  },

  openCheckoutModal() {
    const overlay = document.getElementById('checkoutOverlay');
    overlay.classList.add('active');

    // Pre-fill user data if logged in
    if (window.Auth.currentUser) {
      const user = window.Auth.currentUser;
      const nameInput = document.getElementById('checkoutName');
      const emailInput = document.getElementById('checkoutEmail');
      if (nameInput && !nameInput.value) nameInput.value = user.name;
      if (emailInput && !emailInput.value) emailInput.value = user.email;
    }

    // Render Checkout Order Summary
    const itemsContainer = document.getElementById('checkoutItemsReview');
    itemsContainer.innerHTML = window.Cart.items.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 0.88rem;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${item.image}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;" />
          <div>
            <div style="font-weight: 600; color: #fff;">${item.name}</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
          </div>
        </div>
        <div style="font-weight: 700; color: #fff;">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');

    document.getElementById('checkoutSubtotal').textContent = `$${window.Cart.getSubtotal().toFixed(2)}`;
    document.getElementById('checkoutDiscount').textContent = `-$${window.Cart.getDiscount().toFixed(2)}`;
    document.getElementById('checkoutShipping').textContent = window.Cart.getShippingFee() === 0 ? 'FREE' : `$${window.Cart.getShippingFee().toFixed(2)}`;
    document.getElementById('checkoutTax').textContent = `$${window.Cart.getTax().toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `$${window.Cart.getTotal().toFixed(2)}`;
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('placeOrderBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Order...';

    const orderData = {
      customer_name: document.getElementById('checkoutName').value,
      customer_email: document.getElementById('checkoutEmail').value,
      customer_phone: document.getElementById('checkoutPhone').value,
      shipping_address: document.getElementById('checkoutAddress').value,
      shipping_city: document.getElementById('checkoutCity').value,
      shipping_postal_code: document.getElementById('checkoutZip').value,
      shipping_country: 'United States',
      shipping_method: document.querySelector('input[name="shipping_method"]:checked')?.value || 'standard',
      payment_method: document.querySelector('input[name="payment_method"]:checked')?.value || 'Credit Card',
      items: window.Cart.items,
      promo_code: window.Cart.promo ? window.Cart.promo.code : null
    };

    try {
      const response = await API.createOrder(orderData);
      
      // Close checkout modal
      document.getElementById('checkoutOverlay').classList.remove('active');
      window.Cart.clearCart();

      // Open Success Modal
      const order = response.order;
      document.getElementById('successOrderNumber').textContent = order.order_number;
      document.getElementById('successOrderTotal').textContent = `$${order.total.toFixed(2)}`;
      document.getElementById('successRecipient').textContent = `${order.customer_name} (${order.customer_email})`;
      document.getElementById('successAddress').textContent = order.shipping_address;
      document.getElementById('successOverlay').classList.add('active');

      showToast(`Order ${order.order_number} confirmed!`, 'success');
      this.loadProducts(); // update inventory
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order & Pay';
    }
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.Cart.init();
  window.Auth.init();
  window.App.init();
});
