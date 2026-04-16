import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgramsModal from '../../components/ProgramsModal';
import Button from '../../components/Button/Button';
import Navbar from "../../components/Navbar/Navbar";
import "./MainPage.css"

const MainPage = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const userId = Number(localStorage.getItem('userId'));

  const domain = process.env.REACT_APP_API_URL_GET_PROGRAMMS || process.env.REACT_APP_API_URL || 'localhost:8000';
  const API_BASE_URL = domain.startsWith('http') ? domain : `http://${domain}`;

  const fetchPrograms = async () => {
    if (!Number.isInteger(userId) || userId <= 0) {
      alert('Пользователь не авторизован. Войдите заново.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get-programs?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const normalizedPrograms = (data.programs || []).map((programPath) => ({
        path: programPath,
        displayName: String(programPath).replace(/^frontend\//i, ''),
      }));
      setPrograms(normalizedPrograms);
      setIsOpen(true);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось получить программы');
    } finally {
      setLoading(false);
    }
  };

  const handleShowGraph = (programFolder) => {
    if (!programFolder) {
      return;
    }

    setIsOpen(false);
    navigate(`/graph?folder=${encodeURIComponent(programFolder)}`);
  };

  const handleAddProgram = () => {
    navigate('/work_program');
  };

  const handleManualAdd = () => {
    navigate('/upload_programs');
  };

  return (
    <>
      <Navbar/>
      <main className="main-page-center">
        <Button
          onClick={fetchPrograms}
          width="260px"
          height="43px"
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Выберите рабочую программу'}
        </Button>
        <Button
          onClick={handleAddProgram}
          width="260px"
          height="43px"
        >
          Добавить программу
        </Button>
        <Button
            onClick={handleManualAdd}
            width="260px"
            height="43px"
        >
          Добавить свою программу
        </Button>
      </main>

      <ProgramsModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        programs={programs}
        onShowGraph={handleShowGraph}
      />


    </>
  );
};

export default MainPage;