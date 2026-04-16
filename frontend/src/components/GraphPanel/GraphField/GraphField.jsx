import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import './GraphField.css';

cytoscape.use(dagre);

const applyGraphVisibility = (cy, selectedNodeIds, hiddenNodeIds) => {
  if (!cy) return;

  cy.batch(() => {
    cy.nodes().removeClass('highlighted').style('display', 'element');
    cy.edges().style('display', 'element');
    cy.nodes().unselect();

    selectedNodeIds.forEach((nodeId) => {
      const node = cy.getElementById(nodeId);
      if (node.nonempty()) {
        node.addClass('highlighted');
        node.select();
      }
    });

    hiddenNodeIds.forEach((nodeId) => {
      const node = cy.getElementById(nodeId);
      if (node.nonempty()) {
        node.style('display', 'none');
        node.connectedEdges().style('display', 'none');
      }
    });
  });
};

const GraphField = forwardRef(({ 
  data, 
  selectedNodeIds = [], 
  hiddenNodeIds = [], 
  onHideSelected, 
  hideButtonText = 'Скрыть выбранные', 
  keepOnlyButtonText = 'Оставить только выделенные и потомков', 
  onKeepOnlySelectedAndDescendants, 
  onHideSubtopicsForDisciplines, 
  onHideTopicsAndSubtopicsForDisciplines, 
  areAllSelectedDisciplines = false, 
  onToggleNodeSelection, 
  onSelectionChange 
}, ref) => {
  const shellRef = useRef(null);
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const ignoreTapCloseUntilRef = useRef(0);
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  const onToggleNodeSelectionRef = useRef(onToggleNodeSelection);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0 });

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  useEffect(() => {
    onToggleNodeSelectionRef.current = onToggleNodeSelection;
  }, [onToggleNodeSelection]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const closeContextMenu = () => {
    setContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
  };

  const openContextMenu = (clientX, clientY) => {
    if (!selectedNodeIdsRef.current.length) {
      closeContextMenu();
      return;
    }

    // Задержка, чтобы клик по узлу не закрыл меню сразу после ПКМ
    ignoreTapCloseUntilRef.current = Date.now() + 220;

    const shell = shellRef.current;
    if (!shell) return;

    const rect = shell.getBoundingClientRect();
    setContextMenu({
      open: true,
      x: clientX - rect.left,
      y: clientY - rect.top
    });
  };

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      if (cyRef.current) {
        const png = cyRef.current.png();
        const link = document.createElement('a');
        link.download = 'graph.png';
        link.href = png;
        link.click();
      }
    },
    exportPDF: () => {
      if (cyRef.current) {
        const png = cyRef.current.png({ full: true, maxWidth: 1920, maxHeight: 1080 });
        const link = document.createElement('a');
        link.download = 'graph.pdf';
        link.href = png;
        link.click();
      }
    }
  }));

  useEffect(() => {
    if (!containerRef.current || !data) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const allSubjects = Object.keys(data);
    const nodesSet = new Set(allSubjects);

    allSubjects.forEach(subject => {
      const subjectData = data[subject];
      const predecessors = subjectData.предметы_до || [];
      const successors = subjectData.предметы_после || [];
      
      predecessors.forEach(p => nodesSet.add(p));
      successors.forEach(s => nodesSet.add(s));
    });

    const nodes = Array.from(nodesSet).map(name => ({
      data: {
        id: name,
        label: name,
        isMain: allSubjects.includes(name) ? 'true' : 'false',
        nodeType: 'discipline'
      }
    }));

    const edges = [];
    const edgesSet = new Set();

    allSubjects.forEach(subject => {
      const subjectData = data[subject];
      const predecessors = subjectData.предметы_до || [];
      const successors = subjectData.предметы_после || [];

      predecessors.forEach(p => {
        const edgeKey = `${p}->${subject}`;
        if (!edgesSet.has(edgeKey)) {
          edges.push({ data: { source: p, target: subject } });
          edgesSet.add(edgeKey);
        }
      });

      successors.forEach(s => {
        const edgeKey = `${subject}->${s}`;
        if (!edgesSet.has(edgeKey)) {
          edges.push({ data: { source: subject, target: s } });
          edgesSet.add(edgeKey);
        }
      });

      const topics = Array.isArray(subjectData.темы) ? subjectData.темы : [];
      topics.forEach((topic) => {
        const topicName = topic?.name;
        if (!topicName) return;

        const topicId = `topic::${subject}::${topicName}`;
        nodes.push({
          data: {
            id: topicId,
            label: topicName,
            isMain: 'false',
            nodeType: 'topic'
          }
        });

        const subjectToTopicEdge = `${subject}->${topicId}`;
        if (!edgesSet.has(subjectToTopicEdge)) {
          edges.push({ data: { source: subject, target: topicId } });
          edgesSet.add(subjectToTopicEdge);
        }

        const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];
        subtopics.forEach((subtopic) => {
          if (!subtopic) return;

          const subtopicId = `subtopic::${subject}::${topicName}::${subtopic}`;
          nodes.push({
            data: {
              id: subtopicId,
              label: subtopic,
              isMain: 'false',
              nodeType: 'subtopic'
            }
          });

          const topicToSubtopicEdge = `${topicId}->${subtopicId}`;
          if (!edgesSet.has(topicToSubtopicEdge)) {
            edges.push({ data: { source: topicId, target: subtopicId } });
            edgesSet.add(topicToSubtopicEdge);
          }
        });
      });
    });

    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: { nodes, edges },
        boxSelectionEnabled: true,
        selectionType: 'additive',
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#ffffff',
              'label': 'data(label)',
              'shape': 'ellipse',
              'width': 140,
              'height': 50,
              'font-size': '13px',
              'text-valign': 'center',
              'text-halign': 'center',
              'border-width': 2,
              'border-color': '#000000',
              'color': '#000000',
              'font-weight': 600,
              'text-wrap': 'wrap',
              'text-max-width': 120
            }
          },
          {
            selector: 'node[isMain = "true"]',
            style: {
              'background-color': '#8B4545',
              'border-color': '#5D2E2E',
              'border-width': 3,
              'color': '#ffffff',
              'font-weight': 'bold'
            }
          },
          {
            selector: 'node[nodeType = "topic"]',
            style: {
              'background-color': '#E3F2FD',
              'border-color': '#1565C0',
              'color': '#0D47A1',
              'shape': 'round-rectangle',
              'width': 130,
              'height': 44,
            }
          },
          {
            selector: 'node[nodeType = "subtopic"]',
            style: {
              'background-color': '#E8F5E9',
              'border-color': '#2E7D32',
              'color': '#1B5E20',
              'shape': 'round-rectangle',
              'width': 120,
              'height': 40,
              'font-size': '12px'
            }
          },
          {
            selector: 'node.highlighted',
            style: {
              'border-color': '#FF9800',
              'border-width': 5,
              'overlay-opacity': 0,
              'z-index': 999
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#000000',
              'target-arrow-color': '#000000',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'font-size': '11px',
              'text-rotation': 'autorotate',
              'color': '#666'
            }
          }
        ],
        layout: { name: 'dagre', rankDir: 'TB', spacingFactor: 1.5, animate: true }
      });

      cyRef.current = cy;

      setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.resize();
          cyRef.current.fit();
        }
      }, 100);

      cy.on('tap', 'node', (event) => {
        if (Date.now() < ignoreTapCloseUntilRef.current) return;

        const nativeEvent = event.originalEvent;
        if (nativeEvent && nativeEvent.button !== 0) return;

        closeContextMenu();
        const tappedNode = event.target;
        const nodeData = tappedNode.data();

        if (onToggleNodeSelectionRef.current) {
          onToggleNodeSelectionRef.current(nodeData.id);
        }
      });

      cy.on('tap', (tapEvent) => {
        if (Date.now() < ignoreTapCloseUntilRef.current) return;

        const nativeEvent = tapEvent.originalEvent;
        if (nativeEvent && nativeEvent.button !== 0) return;

        closeContextMenu();
      });

      cy.on('cxttap', (event) => {
        if (!selectedNodeIdsRef.current.length) {
          closeContextMenu();
          return;
        }

        const nativeEvent = event.originalEvent;
        if (!nativeEvent) return;

        nativeEvent.preventDefault();
        openContextMenu(nativeEvent.clientX, nativeEvent.clientY);
      });

      const syncSelectedFromGraph = () => {
        if (!onSelectionChangeRef.current) return;
        const selectedIds = cy.nodes(':selected').map((node) => node.id());
        onSelectionChangeRef.current(selectedIds);
      };

      cy.on('boxend', syncSelectedFromGraph);
      cy.on('select unselect', 'node', syncSelectedFromGraph);

      applyGraphVisibility(cy, selectedNodeIds, hiddenNodeIds);
    } catch (err) {
      console.error('Error creating cytoscape graph:', err);
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [data]);

  useEffect(() => {
    if (!cyRef.current) return;
    applyGraphVisibility(cyRef.current, selectedNodeIds, hiddenNodeIds);
  }, [selectedNodeIds, hiddenNodeIds]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    const handleGlobalPointerDown = (event) => {
      const shell = shellRef.current;
      if (!shell) return;

      if (!shell.contains(event.target)) {
        closeContextMenu();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('pointerdown', handleGlobalPointerDown);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('pointerdown', handleGlobalPointerDown);
    };
  }, []);

  const handleShellContextMenu = (event) => {
    event.preventDefault();
    if (!selectedNodeIdsRef.current.length) {
      closeContextMenu();
      return;
    }
    openContextMenu(event.clientX, event.clientY);
  };

  const handleContextActionClick = (event) => {
    event.stopPropagation();
    if (!selectedNodeIds.length) return;
    onHideSelected?.();
    closeContextMenu();
  };

  const handleKeepOnlyClick = (event) => {
    event.stopPropagation();
    if (!selectedNodeIds.length) return;
    onKeepOnlySelectedAndDescendants?.();
    closeContextMenu();
  };

  const handleHideSubtopicsClick = (event) => {
    event.stopPropagation();
    if (!areAllSelectedDisciplines) return;
    onHideSubtopicsForDisciplines?.();
    closeContextMenu();
  };

  const handleHideTopicsAndSubtopicsClick = (event) => {
    event.stopPropagation();
    if (!areAllSelectedDisciplines) return;
    onHideTopicsAndSubtopicsForDisciplines?.();
    closeContextMenu();
  };

  const handleContextMenuClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div ref={shellRef} className="graph-field-shell" onContextMenu={handleShellContextMenu}>
      <div ref={containerRef} className="graph-field" />
      {contextMenu.open && (
        <div
          className="graph-field__context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={handleContextMenuClick}
        >
          <button
            type="button"
            className="graph-field__context-action"
            onClick={handleContextActionClick}
            disabled={!selectedNodeIds.length}
          >
            {hideButtonText}
          </button>
          <button
            type="button"
            className="graph-field__context-action"
            onClick={handleKeepOnlyClick}
            disabled={!selectedNodeIds.length}
          >
            {keepOnlyButtonText}
          </button>
          {areAllSelectedDisciplines && (
            <>
              <button
                type="button"
                className="graph-field__context-action"
                onClick={handleHideSubtopicsClick}
              >
                Скрыть все подтемы
              </button>
              <button
                type="button"
                className="graph-field__context-action"
                onClick={handleHideTopicsAndSubtopicsClick}
              >
                Скрыть все темы и подтемы
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default GraphField;