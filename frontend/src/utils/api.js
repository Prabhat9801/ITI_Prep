const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('--- API Error Details ---');
    console.error('Endpoint:', endpoint);
    console.error('Full URL:', `${API_BASE_URL}${endpoint}`);
    console.error('Message:', error.message);
    console.error('------------------------');
    throw error;
  }
};
