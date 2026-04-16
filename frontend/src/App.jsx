import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import WorkProgramPage from './pages/WorkProgramPage/WorkProgramPage';
import GraphPage from './pages/GraphPage/GraphPage';
import './assets/styles/global.css';
import MainPage from './pages/MainPage/MainPage';
import UploadProgram from './components/UploadProgram';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/work_program" element={< WorkProgramPage/>} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/main" element={< MainPage/>} />
        <Route path="/upload_programs" element={< UploadProgram/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;