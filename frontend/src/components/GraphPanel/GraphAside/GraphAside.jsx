import React from 'react';
import { useNavigate } from 'react-router-dom';
import "./GraphAside.css"
import Button from "../../Button/Button";

const GraphAside = ({
    hiddenNodeIds = [],
    onToggleTopics,
    onToggleSubtopics,
    isAllTopicsHidden = false,
    isAllSubtopicsHidden = false,
    onUndoLastHide,
    onShowAll,
    canUndo = false
}) => {
    const navigate = useNavigate();

    return (
        <aside className="graph-aside">
        <div className="graph-aside__controls">
          <h3 className="graph-aside__title">Управление вершинами</h3>
          <div className="graph-aside__meta">
            Скрыто: {hiddenNodeIds.length}
          </div>
          <div className="graph-aside__hint">
            Shift + выделение области: множественный выбор
            <br />
            Ctrl+Z: отменить последнее скрытие.
          </div>

          <label className="graph-aside__toggle-item">
            <input
              type="checkbox"
              checked={isAllTopicsHidden}
              onChange={onToggleTopics}
            />
            <span>Скрыть все темы</span>
          </label>

          <label className="graph-aside__toggle-item">
            <input
              type="checkbox"
              checked={isAllSubtopicsHidden}
              onChange={onToggleSubtopics}
            />
            <span>Скрыть все подтемы</span>
          </label>

          <Button
            type="button"
            onClick={onUndoLastHide}
            width="100%"
            disabled={!canUndo}
          >
            Отменить последнее скрытие
          </Button>

          <Button
            type="button"
            onClick={onShowAll}
            width="100%"
            disabled={!hiddenNodeIds.length}
          >
            Показать все
          </Button>
        </div>

        <Button 
          type="button"
          onClick={() => { navigate('/main'); }}
        >
            Программы с сервера
        </Button>
        <Button 
          type="button"
          onClick={() => { navigate('/work_program'); }}
        >
            Ввод рабочей программы
        </Button>
        </aside>
    );
};

export default GraphAside;