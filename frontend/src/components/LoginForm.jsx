import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import Button from './Button/Button';
import Input from './Input';
import Card from './Card';
import './LoginForm.css';

import { login } from '../services/api/auth';


function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    
    const result = await login(email, password);
    
    if (result.success) {
      if (result.id) {
        localStorage.setItem('userId', String(result.id));
      }
      localStorage.setItem('userLogin', email);
      navigate('/main');
    } else {
      setError(result.error);
    }
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div className="login-container">
      <Card>
        <div className="login-frame">
          <FiUser className="user-icon" />
        </div>

        <div className="login-text">
          <h2>Вход</h2>
          <span>Войти в аккаунт с помощью электронной почты</span>
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
          onClick={handleLogin}
          width="260px"
          height="43px"
          absolute={false}
        >
          Войти
        </Button>

        <div className="register-text" onClick={handleRegisterClick}>
          Зарегистрироваться
        </div>
      </Card>
    </div>
  );
}

export default LoginForm;