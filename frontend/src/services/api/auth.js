
const domain = process.env.REACT_APP_API_URL || 'localhost:8000';
const API_BASE_URL = domain.startsWith('http') ? domain : `http://${domain}`;

export const login = async (login, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login, password })
    });

    const body = await response.json().catch(() => ({}));

    if (response.status === 200) {
      return { success: true, id: body.id };
    }
    
    if (response.status === 401) {
      return { success: false, error: 'Неправильный логин или пароль' };
    }
    
    if (response.status === 409) {
      return { success: false, error: 'Конфликт данных' };
    }
    
    if (response.status === 500) {
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
    
    return { success: false, error: 'Ошибка сервера' };
    
  } catch (err) {
    return { success: false, error: 'Ошибка соединения' };
  }
};

export const register = async (login, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login, password })
    });

    const body = await response.json().catch(() => ({}));

    if (response.status === 201) {
      return { success: true, id: body.id };
    }
    
    if (response.status === 401) {
      return { success: false, error: 'Неправильный логин или пароль' };
    }
    
    if (response.status === 409 || response.status === 422) {
      return { success: false, error: 'Пользователь с таким логином уже существует' };
    }
    
    if (response.status === 500) {
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
    
    return { success: false, error: 'Ошибка сервера' };
    
  } catch (err) {
    return { success: false, error: 'Ошибка соединения' };
  }
};