/**
 * Authentication & User Session Module
 */

const Auth = {
  currentUser: null,

  init() {
    this.checkSession();
    this.bindEvents();
  },

  checkSession() {
    const userStr = localStorage.getItem('lumen_user');
    const token = localStorage.getItem('lumen_token');

    if (userStr && token) {
      try {
        this.currentUser = JSON.parse(userStr);
        this.updateNavUI();
        // Silently verify with backend
        API.getProfile()
          .then(res => {
            this.currentUser = res.user;
            localStorage.setItem('lumen_user', JSON.stringify(res.user));
            this.updateNavUI();
          })
          .catch(() => {
            // Token expired or invalid
            this.logout();
          });
      } catch (e) {
        this.logout();
      }
    } else {
      this.updateNavUI();
    }
  },

  bindEvents() {
    // Open Auth Modal
    const loginTriggerBtn = document.getElementById('loginTriggerBtn');
    if (loginTriggerBtn) {
      loginTriggerBtn.addEventListener('click', () => this.openModal('login'));
    }

    // Toggle Dropdown
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userAvatarBtn && userDropdown) {
      userAvatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
      });
    }

    // Auth Modal Close
    const authModalClose = document.getElementById('authModalClose');
    const authOverlay = document.getElementById('authOverlay');
    if (authModalClose && authOverlay) {
      authModalClose.addEventListener('click', () => this.closeModal());
      authOverlay.addEventListener('click', (e) => {
        if (e.target === authOverlay) this.closeModal();
      });
    }

    // Tabs toggle (Sign In vs Register)
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => this.switchTab('login'));
      tabRegister.addEventListener('click', () => this.switchTab('register'));
    }

    // Form Submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // My Orders Trigger
    const myOrdersBtn = document.getElementById('myOrdersBtn');
    if (myOrdersBtn) {
      myOrdersBtn.addEventListener('click', () => this.openOrdersModal());
    }

    const ordersModalClose = document.getElementById('ordersModalClose');
    const ordersOverlay = document.getElementById('ordersOverlay');
    if (ordersModalClose && ordersOverlay) {
      ordersModalClose.addEventListener('click', () => ordersOverlay.classList.remove('active'));
      ordersOverlay.addEventListener('click', (e) => {
        if (e.target === ordersOverlay) ordersOverlay.classList.remove('active');
      });
    }

    // Fill Demo Credentials
    const demoFillBtn = document.getElementById('demoFillBtn');
    if (demoFillBtn) {
      demoFillBtn.addEventListener('click', () => {
        document.getElementById('loginEmail').value = 'demo@ecommerce.com';
        document.getElementById('loginPassword').value = 'password123';
      });
    }
  },

  openModal(tab = 'login') {
    this.switchTab(tab);
    document.getElementById('authOverlay').classList.add('active');
  },

  closeModal() {
    document.getElementById('authOverlay').classList.remove('active');
  },

  switchTab(tab) {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginFormWrap = document.getElementById('loginFormWrap');
    const registerFormWrap = document.getElementById('registerFormWrap');

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginFormWrap.style.display = 'block';
      registerFormWrap.style.display = 'none';
    } else {
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
      loginFormWrap.style.display = 'none';
      registerFormWrap.style.display = 'block';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
      const data = await API.login({ email, password });
      localStorage.setItem('lumen_token', data.token);
      localStorage.setItem('lumen_user', JSON.stringify(data.user));
      this.currentUser = data.user;
      this.updateNavUI();
      this.closeModal();
      showToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('regError');
    errorEl.textContent = '';

    try {
      const data = await API.register({ name, email, password });
      localStorage.setItem('lumen_token', data.token);
      localStorage.setItem('lumen_user', JSON.stringify(data.user));
      this.currentUser = data.user;
      this.updateNavUI();
      this.closeModal();
      showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  },

  logout() {
    localStorage.removeItem('lumen_token');
    localStorage.removeItem('lumen_user');
    this.currentUser = null;
    this.updateNavUI();
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) userDropdown.classList.remove('active');
    showToast('You have been signed out.', 'success');
  },

  updateNavUI() {
    const guestNav = document.getElementById('guestNav');
    const userNav = document.getElementById('userNav');
    const userNameSpan = document.getElementById('userNameSpan');
    const userAvatarImg = document.getElementById('userAvatarImg');

    if (this.currentUser) {
      if (guestNav) guestNav.style.display = 'none';
      if (userNav) userNav.style.display = 'block';
      if (userNameSpan) userNameSpan.textContent = this.currentUser.name;
      if (userAvatarImg) userAvatarImg.src = this.currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(this.currentUser.name)}`;
    } else {
      if (guestNav) guestNav.style.display = 'block';
      if (userNav) userNav.style.display = 'none';
    }
  },

  async openOrdersModal() {
    const ordersOverlay = document.getElementById('ordersOverlay');
    const ordersList = document.getElementById('ordersListContainer');
    ordersOverlay.classList.add('active');
    ordersList.innerHTML = '<div style="text-align:center; padding: 40px;"><p>Loading your orders...</p></div>';

    try {
      const res = await API.getMyOrders();
      if (!res.orders || res.orders.length === 0) {
        ordersList.innerHTML = `
          <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
            <h3 style="margin: 12px 0 6px;">No orders found</h3>
            <p>You haven't placed any orders yet.</p>
          </div>
        `;
        return;
      }

      ordersList.innerHTML = res.orders.map(order => `
        <div class="order-history-card">
          <div class="order-history-top">
            <div>
              <div style="font-weight: 800; font-family: var(--font-heading); color: #fff; font-size: 1.1rem;">${order.order_number}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style="text-align: right;">
              <span class="order-badge">${order.status}</span>
              <div style="font-weight: 800; font-size: 1.1rem; color: #fff; margin-top: 4px;">₹${Math.round(order.total).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
            Shipped to: <strong style="color: #fff;">${order.customer_name}</strong> (${order.shipping_address})
          </div>
          <div class="order-items-thumbnails">
            ${order.items.map(item => `
              <img class="order-thumb-img" src="${item.image}" title="${item.name} (x${item.quantity})" alt="${item.name}" />
            `).join('')}
            <span style="font-size: 0.82rem; color: var(--text-subtle); margin-left: 6px;">${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      ordersList.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 30px;">${err.message}</div>`;
    }
  }
};

window.Auth = Auth;
