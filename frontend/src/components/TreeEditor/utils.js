
export const generateId = () => Date.now() + '-' + Math.random().toString(36).substr(2, 9);

export const getChildType = (parentType) => {
  const map = {
    'discipline': 'topic',
    'topic': 'subtopic',
    'subtopic': null
  };
  return map[parentType];
};

export const getRussianType = (type) => {
  const map = {
    'discipline': 'дисциплина',
    'topic': 'тема',
    'subtopic': 'подтема'
  };
  return map[type] || type;
};

export const getPlaceholder = (type) => {
  const map = {
    'discipline': 'Название дисциплины',
    'topic': 'Название темы',
    'subtopic': 'Название подтемы'
  };
  return map[type] || 'Введите название';
};


export const convertToBackendFormat = (programName, disciplines) => {
  const result = {};

  result[programName] = disciplines.map((discipline) => {
    const topics = discipline.children.map((topic) => {
      const topicObj = {};
      topicObj[topic.name] = topic.children.map((sub) => sub.name);
      return topicObj;
    });

    return {
      [discipline.name]: {
        previousDisciplines: discipline.previousDisciplines || [],
        topics
      }
    };
  });

  return result;
};

const domain = process.env.REACT_APP_API_URL_ADD_PROGRAM || process.env.REACT_APP_API_URL || 'localhost:8000';
const API_BASE_URL = domain.startsWith('http') ? domain : `http://${domain}`;

export const submitProgram = async (programName, disciplines) => {
  const userId = Number(localStorage.getItem('userId'));
  const data = {
    ...convertToBackendFormat(programName, disciplines),
    idUser: userId,
  };

  if (!programName || !programName.trim()) {
    return { success: false, error: 'Укажите название образовательной программы' };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: 'Пользователь не авторизован. Войдите заново.' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/add-program`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.responseMessage || `HTTP error! status: ${res.status}`);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Ошибка соединения' };
  }
};