import React, { useState, useRef, useEffect } from 'react';
import { getChildType, getRussianType, getPlaceholder, generateId } from './utils';
import './TreeEditor.css';

const TreeNode = ({ node, onUpdate, onAddSibling, level = 0 }) => {

  const [isExpanded, setIsExpanded] = useState(true);
  const [prevInput, setPrevInput] = useState('');

  const inputRef = useRef(null);

  const childType = getChildType(node.type);
  const canAddChild = childType !== null;

  useEffect(() => {
    if (node.name === '' && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 0);
    }
  }, [node.id]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onAddSibling) {
        onAddSibling(node.type);
      }
    }
  };

  const handleNameChange = (e) => {
    onUpdate({
      ...node,
      name: e.target.value
    });
  };

  const handleAddChild = () => {
    if (!childType) return;

    const newChild = {
      id: generateId(),
      name: '',
      type: childType,
      children: []
    };

    onUpdate({
      ...node,
      children: [...node.children, newChild]
    });
  };

  const handleAddPrev = () => {
    if (!prevInput.trim()) return;

    const list = node.previousDisciplines || [];

    onUpdate({
      ...node,
      previousDisciplines: [...list, prevInput]
    });
    setPrevInput('');
  };

  const handleChildUpdate = (childIndex, updatedChild) => {
    const copy = [...node.children];
    copy[childIndex] = updatedChild;

    onUpdate({
      ...node,
      children: copy
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Удалить ${getRussianType(node.type)} "${node.name || 'без названия'}"?`)) {
      onUpdate(null); 
    }
  };

  return (
    <div
      className="tree-node"
      style={{ marginLeft: level * 16 }}
    >

      <div className="node-content">

        {/* Кнопка свернуть/развернуть */}
        <button
          className="toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!node.children || node.children.length === 0}
        >
          {node.children && node.children.length > 0
            ? (isExpanded ? '-' : '+') : '.'} {/* точка означает "нет детей" */}
        </button>

        {/* Поле ввода названия */}
        <input
          ref={inputRef}
          className="node-input"
          type="text"
          value={node.name}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder(node.type)}
        />

        {/* Бейдж с типом элемента на русском */}
        <span className="type-badge">
          {getRussianType(node.type)}
        </span>

        {/* Кнопка добавления ребенка (темы/подтемы) */}
        {canAddChild &&
          <button
            className="action-btn add-btn"
            onClick={handleAddChild}>
            +
          </button>
        }

        {/* Кнопка удаления */}
        <button
          className="action-btn delete-btn"
          onClick={handleDelete}
        >
          X
        </button>

      </div>

      {/* Секция предшествующих дисциплин (только для дисциплин) */}
      {node.type === 'discipline' && (
        <div className="prev-disciplines">

          {/* Поле ввода новой предшествующей дисциплины */}
          <div className="prev-input">
            <input
              type="text"
              placeholder="Предшествующая дисциплина"
              value={prevInput}
              onChange={(e) => setPrevInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPrev();
                }
              }}
            />
            <button onClick={handleAddPrev}>+</button>
          </div>

          {/* Список добавленных предшествующих дисциплин */}
          <ul className="prev-list">
            {(node.previousDisciplines || []).map((p, i) => (
              <li key={i} className="prev-item">
                <span>{p}</span>
                <button
                  className="remove-prev"
                  onClick={() => {
                    const updated = node.previousDisciplines.filter(
                      (_, index) => index !== i
                    );
                    onUpdate({
                      ...node,
                      previousDisciplines: updated
                    });
                  }}>
                  X
                </button>
              </li>
            ))
            }
          </ul>

        </div>
      )
      }

      {/* Дочерние элементы (темы/подтемы) - отображаются если развернуто */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="children-container">
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}

              onAddSibling={(type) => {
                const newNode = {
                  id: generateId(),
                  name: '',
                  type,
                  children: []
                };

                const updated = [
                  ...node.children.slice(0, index + 1),
                  newNode,
                  ...node.children.slice(index + 1)
                ];

                onUpdate({
                  ...node,
                  children: updated
                });
              }}

              onUpdate={(updatedChild) => {
                if (updatedChild === null) {
                  const filtered = node.children.filter((_, i) => i !== index);
                  onUpdate({
                    ...node,
                    children: filtered
                  });
                } else {
                  handleChildUpdate(index, updatedChild);
                }
              }
            }
            />
          ))
          }
        </div>
      )}

    </div>
  );
};

export default TreeNode;