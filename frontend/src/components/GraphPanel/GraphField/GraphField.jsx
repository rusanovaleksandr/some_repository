import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import './GraphField.css';

cytoscape.use(dagre);

const GraphField = forwardRef(({ data, onNodeSelect }, ref) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

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

    // очистка предыдущего графа
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

    // узлы дисциплин
    const nodes = Array.from(nodesSet).map(name => ({
      data: {
        id: name,
        label: name,
        isMain: allSubjects.includes(name) ? 'true' : 'false',
        nodeType: 'discipline'
      }
    }));

    // ребра 
    const edges = [];
    const edgesSet = new Set();

    allSubjects.forEach(subject => {
      const subjectData = data[subject];
      const predecessors = subjectData.предметы_до || [];
      const successors = subjectData.предметы_после || [];

      // ребра от предшественников к текущему предмету
      predecessors.forEach(p => {
        const edgeKey = `${p}->${subject}`;
        if (!edgesSet.has(edgeKey)) {
          edges.push({
            data: { source: p, target: subject }
          });
          edgesSet.add(edgeKey);
        }
      });

      // ребра от текущего предмета к преемникам
      successors.forEach(s => {
        const edgeKey = `${subject}->${s}`;
        if (!edgesSet.has(edgeKey)) {
          edges.push({
            data: { source: subject, target: s }
          });
          edgesSet.add(edgeKey);
        }
      });

      // узлы тем и подтем
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

  return <div ref={containerRef} className="graph-field" />;
});

export default GraphField;