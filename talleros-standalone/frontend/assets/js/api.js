// ═══════════════════════════════════════════════════════
//  TallerOS API Client
// ═══════════════════════════════════════════════════════

(function() {
  'use strict';

  // Detectar entorno automáticamente
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal ? 'http://localhost:3003/api' : '/api';

  // Token de autenticación
  function getToken() {
    return localStorage.getItem('talleros_token');
  }

  // Headers por defecto
  function getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Manejo de errores centralizado
  function handleError(response) {
    if (response.status === 401) {
      localStorage.removeItem('talleros_token');
      localStorage.removeItem('talleros_user');
      window.location.href = '/login.html';
      throw new Error('Sesión expirada');
    }
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return response;
  }

  // API Client
  window.TallerAPI = {
    baseUrl: API_BASE_URL,

    // GET request
    async get(endpoint) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders()
      });
      handleError(response);
      return response.json();
    },

    // POST request
    async post(endpoint, data) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      handleError(response);
      return response.json();
    },

    // PUT request
    async put(endpoint, data) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      handleError(response);
      return response.json();
    },

    // DELETE request
    async delete(endpoint) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      handleError(response);
      return response.json();
    },

    // Upload file
    async upload(endpoint, formData) {
      const headers = {};
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });
      handleError(response);
      return response.json();
    }
  };

  // Exponer la URL base para uso directo si es necesario
  window.API_BASE_URL = API_BASE_URL;
})();
