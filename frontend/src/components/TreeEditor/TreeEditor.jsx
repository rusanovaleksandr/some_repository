import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import TreeNode from './TreeNode';
import EmptyState from './EmptyState';
import TreeActions from './TreeActions';
import JsonViewer from './JsonViewer';
import { generateId, convertToBackendFormat, submitProgram } from './utils';
import './TreeEditor.css';

const TreeEditor = () => {
  const navigate = useNavigate();

  const [programName, setProgramName] = useState(''); 

  const [disciplines, setDisciplines] = useState([
    {
      id: generateId(),
      name: '',
      type: 'discipline',
      previousDisciplines: [],
      children: []
    }
  ]);

  const [showJson, setShowJson] = useState(false);

  const handleAddDiscipline = () => {
    setDisciplines([
      ...disciplines,
      {
        id: generateId(),
        name: '',
        type: 'discipline',
        previousDisciplines: [],
        children: []
      }
    ]);
  };

  const handleDisciplineUpdate = (index, updated) => {
    if (updated === null) {
      setDisciplines(disciplines.filter((_, i) => i !== index));
    } else {
      const copy = [...disciplines];
      copy[index] = updated;
      setDisciplines(copy);
    }
  };

  const handleToggleJson = () => {
    setShowJson(!showJson);
  };

  const handleSubmitProgram = async () => {
    const result = await submitProgram(programName, disciplines);
    if (result.success) {
      alert('Рабочая программа успешно добавлена');
      navigate('/main');
      return;
    }
    alert(result.error || 'Ошибка отправки программы');
  };

  return (
    <div className="tree-editor-container">

      <div className="header">
        <h1>Редактор учебной программы</h1>

        {/* Поле для названия всей программы */}
        <input
          type="text"
          className="program-input"
          placeholder="Название образовательной программы"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
        />

        <p className="subtitle">
          Дисциплины → Темы → Подтемы
        </p>
      </div>

      <div className="tree-root">
        {disciplines.length === 0
          ? <EmptyState />
          : disciplines.map((discipline, index) => (
              <TreeNode
                key={discipline.id}
                node={discipline}
                level={0}

                onAddSibling={() => {
                  const newNode = {
                    id: generateId(),
                    name: '',
                    type: 'discipline',
                    previousDisciplines: [],
                    children: []
                  };

                  const updated = [
                    ...disciplines.slice(0, index + 1),
                    newNode,
                    ...disciplines.slice(index + 1)
                  ];

                  setDisciplines(updated);
                }}

                onUpdate={(updated) =>
                  handleDisciplineUpdate(index, updated)
                }
              />
            ))
        }
      </div>

      {/* Панель с кнопками действий */}
      <TreeActions
        onAddDiscipline={handleAddDiscipline}
        onToggleJson={handleToggleJson}
        showJson={showJson}
      />

      {/* Блок отправки на сервер */}
      <div className="submit-block">
        <button
          className="submit-btn"
          onClick={handleSubmitProgram}
        >
          Отправить программу
        </button>
      </div>

      {/* JSON отладчик (появляется при нажатии) */}
      {showJson &&
        <JsonViewer
          data={convertToBackendFormat(programName, disciplines)}
        />
      }

    </div>
  );
};

export default TreeEditor;