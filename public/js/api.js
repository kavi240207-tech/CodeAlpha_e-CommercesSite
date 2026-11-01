/**
 * API Service for Lumen & Co. E-Commerce
 * Clean abstraction layer over all backend REST endpoints
 */

const API = {
  baseUrl: '/api',

  // Get Auth Header
  getAuthHeaders() {
    const token = localStorage.getItem('lumen_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  // 1. Products API
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.minPrice) query.append('minPrice', params.minPrice);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);

    const res = await fetch(`${this.baseUrl}/products?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async getProduct(identifier) {
    const res = await fetch(`${this.baseUrl}/products/${identifier}`);
    if (!res.ok) throw new Error('Product not found');
    return res.json();
  },

  async submitReview(productId, reviewData) {
    const res = await fetch(`${this.baseUrl}/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit review');
    return data;
  },

  // 2. Auth API
  async register(userData) {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async login(credentials) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getProfile() {
    const res = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  // 3. Promo Code API
  async validatePromo(code, subtotal) {
    const res = await fetch(`${this.baseUrl}/promo/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid promo code');
    return data;
  },

  // 4. Order Processing API
  async createOrder(orderData) {
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order processing failed');
    return data;
  },

  async getOrder(orderNumber) {
    const res = await fetch(`${this.baseUrl}/orders/${orderNumber}`);
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },

  async getMyOrders() {
    const res = await fetch(`${this.baseUrl}/orders/user/my-orders`, {
      headers: this.getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user orders');
    return data;
  }
};

window.API = API;
