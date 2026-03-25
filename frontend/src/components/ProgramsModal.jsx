import './ProgramsModal.css';
import Button from '../components/Button/Button';

const ProgramsModal = ({ isOpen, onClose, programs, onShowGraph }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="title-window">Образовательные программы</h3>
        
        {programs.length === 0 ? (
          <p className="text-program">Нет данных</p>
        ) : (
          <ul>
            {programs.map((program, idx) => (
              <li key={idx}>
                <span className="text-program">{program.displayName || program}</span>
                <Button
                type="button"
                color="#000000"
                onClick={() => onShowGraph(program.path || program)}
                width="160px"
                height="43px"
                absolute={false}
                >
                  <p className="text-program">Показать граф программы</p>
                </Button>
              </li>
            ))}
          </ul>
        )}
        
        <Button
        className="close-button"
        type="button"
        color="#2058c7"
        onClick={onClose}
        width="260px"
        height="43px"
        >
          <p className="text-program">Закрыть</p>
        </Button>
      </div>

    </div>
  );
};

export default ProgramsModal;