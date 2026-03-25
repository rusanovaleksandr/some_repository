const domain = process.env.REACT_APP_API_URL || 'localhost:8000';
const API_BASE_URL = domain.startsWith('http') ? domain : `http://${domain}`;

const buildGraphDataFromProgram = (programJson) => {
  const [programName, disciplines] = Object.entries(programJson || {})[0] || [];
  if (!programName || !disciplines || typeof disciplines !== 'object') {
    return {};
  }

  const graphData = {};

  Object.entries(disciplines).forEach(([disciplineName, disciplineData]) => {
    const prev = Array.isArray(disciplineData?.previousDisciplines)
      ? disciplineData.previousDisciplines
      : [];

    const topicsObject = disciplineData?.topics && typeof disciplineData.topics === 'object'
      ? disciplineData.topics
      : {};

    const topics = Object.keys(topicsObject);
    const topicsWithSubtopics = Object.entries(topicsObject).map(([topicName, topicData]) => ({
      name: topicName,
      subtopics: Array.isArray(topicData?.subtopics) ? topicData.subtopics : [],
    }));

    graphData[disciplineName] = {
      предметы_до: prev,
      предметы_после: [],
      список_тем: topics,
      темы: topicsWithSubtopics,
    };
  });

  Object.keys(graphData).forEach((subjectName) => {
    const predecessors = graphData[subjectName].предметы_до;
    predecessors.forEach((pred) => {
      if (!graphData[pred]) {
        graphData[pred] = {
          предметы_до: [],
          предметы_после: [],
          список_тем: [],
        };
      }

      if (!graphData[pred].предметы_после.includes(subjectName)) {
        graphData[pred].предметы_после.push(subjectName);
      }
    });
  });

  return graphData;
};

export const fetchGraphData = async (userId, programFolder) => {
  const params = new URLSearchParams({
    userId: String(userId),
    pathToProgramFolder: programFolder,
  });

  const response = await fetch(`${API_BASE_URL}/show-graph?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const rawData = await response.json();
  return buildGraphDataFromProgram(rawData);
};