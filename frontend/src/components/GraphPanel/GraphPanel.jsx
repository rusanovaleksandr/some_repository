import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GraphNavbar from './GraphNavbar/GraphNavbar';
import GraphAside from './GraphAside/GraphAside';
import GraphField from './GraphField/GraphField';
import './GraphPanel.css';

const GraphPanel = ({ data }) => {
  const graphFieldRef = useRef(null);
  const historyStepRef = useRef(0);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [hiddenNodeIds, setHiddenNodeIds] = useState([]);
  const [hideHistory, setHideHistory] = useState([]);

  const nodeOptions = useMemo(() => {
    if (!data) return [];

    const nodesMap = new Map();
    const allSubjects = Object.keys(data);

    allSubjects.forEach((subject) => {
      nodesMap.set(subject, {
        id: subject,
        label: subject,
        nodeType: 'discipline'
      });

      const subjectData = data[subject] || {};
      const predecessors = subjectData.предметы_до || [];
      const successors = subjectData.предметы_после || [];

      [...predecessors, ...successors].forEach((name) => {
        if (!nodesMap.has(name)) {
          nodesMap.set(name, { id: name, label: name, nodeType: 'discipline' });
        }
      });

      const topics = Array.isArray(subjectData.темы) ? subjectData.темы : [];
      topics.forEach((topic) => {
        const topicName = topic?.name;
        if (!topicName) return;

        const topicId = `topic::${subject}::${topicName}`;
        nodesMap.set(topicId, {
          id: topicId,
          label: `${topicName} (${subject})`,
          nodeType: 'topic'
        });

        const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];
        subtopics.forEach((subtopic) => {
          if (!subtopic) return;
          const subtopicId = `subtopic::${subject}::${topicName}::${subtopic}`;
          nodesMap.set(subtopicId, {
            id: subtopicId,
            label: `${subtopic} (${subject})`,
            nodeType: 'subtopic'
          });
        });
      });
    });

    return Array.from(nodesMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [data]);

  const handleExportPNG = () => {
    if (graphFieldRef.current) graphFieldRef.current.exportPNG();
  };

  const handleExportGraphPDF = () => {
    if (graphFieldRef.current) graphFieldRef.current.exportPDF();
  };

  const handleToggleNodeSelection = (nodeId) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleSelectionChange = (nodeIds) => {
    setSelectedNodeIds(nodeIds);
  };

  // Получаем все дочерние узлы для выбранных (темы для дисциплин, подтемы для тем)
  const getCascadeNodeIds = useCallback((baseNodeIds) => {
    const cascadeNodeIds = new Set(baseNodeIds);

    baseNodeIds.forEach((nodeId) => {
      const node = nodeOptions.find((candidate) => candidate.id === nodeId);
      if (!node) return;

      if (node.nodeType === 'discipline') {
        nodeOptions.forEach((candidate) => {
          if (candidate.nodeType !== 'topic' && candidate.nodeType !== 'subtopic') return;
          if (candidate.id.startsWith(`topic::${nodeId}::`) || candidate.id.startsWith(`subtopic::${nodeId}::`)) {
            cascadeNodeIds.add(candidate.id);
          }
        });
        return;
      }

      if (node.nodeType === 'topic') {
        const parts = nodeId.split('::');
        const subject = parts[1];
        const topicName = parts[2];
        if (!subject || !topicName) return;

        const subtopicPrefix = `subtopic::${subject}::${topicName}::`;
        nodeOptions.forEach((candidate) => {
          if (candidate.nodeType !== 'subtopic') return;
          if (candidate.id.startsWith(subtopicPrefix)) {
            cascadeNodeIds.add(candidate.id);
          }
        });
      }
    });

    return Array.from(cascadeNodeIds);
  }, [nodeOptions]);

  const handleHideSelected = useCallback(() => {
    if (!selectedNodeIds.length) return;

    const nodesToHide = getCascadeNodeIds(selectedNodeIds);
    const newlyHidden = nodesToHide.filter((id) => !hiddenNodeIds.includes(id));
    
    if (newlyHidden.length) {
      historyStepRef.current += 1;
      setHiddenNodeIds((prev) => Array.from(new Set([...prev, ...newlyHidden])));
      setHideHistory((prev) => [
        ...prev,
        { step: historyStepRef.current, nodeIds: newlyHidden }
      ]);
    }

    setSelectedNodeIds([]);
  }, [getCascadeNodeIds, hiddenNodeIds, selectedNodeIds]);

  const handleKeepOnlySelectedAndDescendants = useCallback(() => {
    if (!selectedNodeIds.length) return;

    const nodesToKeep = new Set(getCascadeNodeIds(selectedNodeIds));
    const nextHiddenNodeIds = nodeOptions
      .map((node) => node.id)
      .filter((id) => !nodesToKeep.has(id));

    const currentHidden = new Set(hiddenNodeIds);
    const hasChanges =
      nextHiddenNodeIds.length !== hiddenNodeIds.length ||
      nextHiddenNodeIds.some((id) => !currentHidden.has(id));

    if (!hasChanges) return;

    historyStepRef.current += 1;
    setHiddenNodeIds(nextHiddenNodeIds);
    setHideHistory((prev) => [
      ...prev,
      {
        step: historyStepRef.current,
        type: 'snapshot',
        previousHiddenNodeIds: hiddenNodeIds
      }
    ]);
  }, [getCascadeNodeIds, hiddenNodeIds, nodeOptions, selectedNodeIds]);

  const handleHideSubtopicsForDisciplines = useCallback(() => {
    if (!selectedNodeIds.length) return;

    const disciplineIds = selectedNodeIds
      .map((id) => nodeOptions.find((n) => n.id === id))
      .filter((n) => n && n.nodeType === 'discipline')
      .map((n) => n.id);

    if (!disciplineIds.length) return;

    const nodesToHide = nodeOptions
      .filter((node) => {
        if (node.nodeType !== 'subtopic') return false;
        return disciplineIds.some((disciplineId) => node.id.includes(`::${disciplineId}::`));
      })
      .map((node) => node.id);

    if (!nodesToHide.length) return;

    const newlyHidden = nodesToHide.filter((id) => !hiddenNodeIds.includes(id));
    if (newlyHidden.length) {
      historyStepRef.current += 1;
      setHiddenNodeIds((prev) => Array.from(new Set([...prev, ...newlyHidden])));
      setHideHistory((prev) => [
        ...prev,
        { step: historyStepRef.current, nodeIds: newlyHidden }
      ]);
    }
  }, [selectedNodeIds, nodeOptions, hiddenNodeIds]);

  const handleHideTopicsAndSubtopicsForDisciplines = useCallback(() => {
    if (!selectedNodeIds.length) return;

    const disciplineIds = selectedNodeIds
      .map((id) => nodeOptions.find((n) => n.id === id))
      .filter((n) => n && n.nodeType === 'discipline')
      .map((n) => n.id);

    if (!disciplineIds.length) return;

    const nodesToHide = nodeOptions
      .filter((node) => {
        if (node.nodeType !== 'topic' && node.nodeType !== 'subtopic') return false;
        return disciplineIds.some((disciplineId) => node.id.includes(`::${disciplineId}::`));
      })
      .map((node) => node.id);

    if (!nodesToHide.length) return;

    const newlyHidden = nodesToHide.filter((id) => !hiddenNodeIds.includes(id));
    if (newlyHidden.length) {
      historyStepRef.current += 1;
      setHiddenNodeIds((prev) => Array.from(new Set([...prev, ...newlyHidden])));
      setHideHistory((prev) => [
        ...prev,
        { step: historyStepRef.current, nodeIds: newlyHidden }
      ]);
    }
  }, [selectedNodeIds, nodeOptions, hiddenNodeIds]);

  const handleHideTopicsForDisciplines = useCallback(() => {
    if (!selectedNodeIds.length) return;

    const disciplineIds = selectedNodeIds
      .map((id) => nodeOptions.find((n) => n.id === id))
      .filter((n) => n && n.nodeType === 'discipline')
      .map((n) => n.id);

    if (!disciplineIds.length) return;

    const nodesToHide = nodeOptions
      .filter((node) => {
        if (node.nodeType !== 'topic') return false;
        return disciplineIds.some((disciplineId) => node.id.includes(`::${disciplineId}::`));
      })
      .map((node) => node.id);

    if (!nodesToHide.length) return;

    const newlyHidden = nodesToHide.filter((id) => !hiddenNodeIds.includes(id));
    if (newlyHidden.length) {
      historyStepRef.current += 1;
      setHiddenNodeIds((prev) => Array.from(new Set([...prev, ...newlyHidden])));
      setHideHistory((prev) => [
        ...prev,
        { step: historyStepRef.current, nodeIds: newlyHidden }
      ]);
    }
  }, [selectedNodeIds, nodeOptions, hiddenNodeIds]);

  const handleToggleByType = useCallback((nodeType) => {
    let nodesToToggle = nodeOptions
      .filter((node) => node.nodeType === nodeType)
      .map((node) => node.id);

    // При скрытии тем скрываем и связанные подтемы
    if (nodeType === 'topic') {
      const relatedSubtopics = nodeOptions
        .filter((node) => {
          if (node.nodeType !== 'subtopic') return false;
          return nodesToToggle.some((topicId) => node.id.includes(topicId));
        })
        .map((node) => node.id);
      nodesToToggle = [...nodesToToggle, ...relatedSubtopics];
    }

    if (!nodesToToggle.length) return;

    const allHidden = nodesToToggle.every((id) => hiddenNodeIds.includes(id));

    if (allHidden) {
      historyStepRef.current += 1;
      setHiddenNodeIds((prev) =>
        prev.filter((id) => !nodesToToggle.includes(id))
      );
      setHideHistory((prev) => [
        ...prev,
        { step: historyStepRef.current, nodeIds: nodesToToggle.filter((id) => hiddenNodeIds.includes(id)) }
      ]);
    } else {
      const newlyHidden = nodesToToggle.filter((id) => !hiddenNodeIds.includes(id));
      if (newlyHidden.length) {
        historyStepRef.current += 1;
        setHiddenNodeIds((prev) => Array.from(new Set([...prev, ...newlyHidden])));
        setHideHistory((prev) => [
          ...prev,
          { step: historyStepRef.current, nodeIds: newlyHidden }
        ]);
      }
    }
  }, [nodeOptions, hiddenNodeIds]);

  const isAllTopicsHidden = useMemo(() => {
    const allTopics = nodeOptions.filter((n) => n.nodeType === 'topic').map((n) => n.id);
    return allTopics.length > 0 && allTopics.every((id) => hiddenNodeIds.includes(id));
  }, [nodeOptions, hiddenNodeIds]);

  const isAllSubtopicsHidden = useMemo(() => {
    const allSubtopics = nodeOptions.filter((n) => n.nodeType === 'subtopic').map((n) => n.id);
    return allSubtopics.length > 0 && allSubtopics.every((id) => hiddenNodeIds.includes(id));
  }, [nodeOptions, hiddenNodeIds]);

  const areAllSelectedDisciplines = useMemo(() => {
    if (!selectedNodeIds.length) return false;
    return selectedNodeIds.every((id) => {
      const node = nodeOptions.find((n) => n.id === id);
      return node && node.nodeType === 'discipline';
    });
  }, [selectedNodeIds, nodeOptions]);

  const getHideButtonText = useMemo(() => {
    if (!selectedNodeIds.length) return 'Скрыть выбранные';

    const types = new Set(
      selectedNodeIds.map((id) => {
        const node = nodeOptions.find((n) => n.id === id);
        return node?.nodeType;
      })
    );

    const hasOnlyDisciplines = types.size === 1 && types.has('discipline');
    const hasOnlyTopics = types.size === 1 && types.has('topic');
    const hasOnlySubtopics = types.size === 1 && types.has('subtopic');

    if (hasOnlyDisciplines) {
      return `Скрыть выбранные дисциплины и их темы/подтемы (${selectedNodeIds.length})`;
    }
    if (hasOnlyTopics) {
      return `Скрыть выбранные темы и их подтемы (${selectedNodeIds.length})`;
    }
    if (hasOnlySubtopics) {
      return `Скрыть выбранные подтемы (${selectedNodeIds.length})`;
    }

    return `Скрыть выбранные и потомков (${selectedNodeIds.length})`;
  }, [selectedNodeIds, nodeOptions]);

  const handleUndoLastHide = useCallback(() => {
    setHideHistory((prev) => {
      if (!prev.length) return prev;

      const lastBatch = prev[prev.length - 1];
      if (lastBatch.type === 'snapshot' && Array.isArray(lastBatch.previousHiddenNodeIds)) {
        setHiddenNodeIds(lastBatch.previousHiddenNodeIds);
        return prev.slice(0, -1);
      }

      const restoredIds = new Set(lastBatch.nodeIds);
      setHiddenNodeIds((hiddenPrev) => hiddenPrev.filter((id) => !restoredIds.has(id)));
      return prev.slice(0, -1);
    });
  }, []);

  const handleShowAll = () => {
    setHiddenNodeIds([]);
    setHideHistory([]);
  };

  // Глобальный хоткей Ctrl+Z для отмены скрытия
  useEffect(() => {
    const handleUndoShortcut = (event) => {
      const isUndo = (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
      if (!isUndo) return;

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isTyping) return;

      event.preventDefault();
      handleUndoLastHide();
    };

    window.addEventListener('keydown', handleUndoShortcut);
    return () => window.removeEventListener('keydown', handleUndoShortcut);
  }, [handleUndoLastHide]);

  if (!data) {
    return <div className="graph-panel-empty">Данные графа не загружены</div>;
  }

  return (
    <>
      <GraphNavbar onExportPNG={handleExportPNG} />
      <div className="graph-panel">
        <GraphAside 
          hiddenNodeIds={hiddenNodeIds}
          onToggleTopics={() => handleToggleByType('topic')}
          onToggleSubtopics={() => handleToggleByType('subtopic')}
          isAllTopicsHidden={isAllTopicsHidden}
          isAllSubtopicsHidden={isAllSubtopicsHidden}
          onUndoLastHide={handleUndoLastHide}
          onShowAll={handleShowAll}
          canUndo={hideHistory.length > 0}
        />
        <GraphField
          ref={graphFieldRef}
          data={data}
          selectedNodeIds={selectedNodeIds}
          hiddenNodeIds={hiddenNodeIds}
          onHideSelected={handleHideSelected}
          hideButtonText={getHideButtonText}
          keepOnlyButtonText="Оставить только выделенные и потомков"
          onKeepOnlySelectedAndDescendants={handleKeepOnlySelectedAndDescendants}
          onHideSubtopicsForDisciplines={handleHideSubtopicsForDisciplines}
          onHideTopicsAndSubtopicsForDisciplines={handleHideTopicsAndSubtopicsForDisciplines}
          onHideTopicsForDisciplines={handleHideTopicsForDisciplines}
          areAllSelectedDisciplines={areAllSelectedDisciplines}
          onToggleNodeSelection={handleToggleNodeSelection}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </>
  );
};

export default GraphPanel;