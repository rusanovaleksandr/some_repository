import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import Button from './Button/Button';
import Input from './Input';
import Card from './Card';
import './RegisterForm.css';

import { register } from '../services/api/auth';

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    
    const result = await register(email, password);
    
    if (result.success) {
      if (result.id) {
        localStorage.setItem('userId', String(result.id));
      }
      localStorage.setItem('userLogin', email);
      navigate('/graph');
    } else {
      setError(result.error);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="register-container">
      <Card>
        <div className="register-frame">
          <FiUser className="user-icon" />
        </div>

        <div className="register-text">
          <h2>Регистрация</h2>
          <span>Зарегистрировать аккаунт с помощью электронной почты</span>
        </div>

        {error && <div className="error">{error}</div>}
        
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon="mail"
        />

        <Input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          icon="settings"
        />
        
        <Button 
          type="button"
          color="#000000"
          onClick={handleRegister}
          width="260px"
          height="43px"
          absolute={false}
        >
          Зарегистрироваться
        </Button>

        <div className="login-text" onClick={handleLoginClick}>
          Войти
        </div>
      </Card>
    </div>
  );
}

export default RegisterForm;