import { BiInfoCircle } from 'react-icons/bi';

const HelperSidebar = ({ title, text }) => {
  if (!title && !text) return null;

  return (
    <aside className="app-helper-sidebar">
      <div className="helper-card">
        <div className="helper-card-header">
          <BiInfoCircle className="helper-icon" />
          <span>{title}</span>
        </div>
        <p>{text}</p>
      </div>
    </aside>
  );
};

export default HelperSidebar;
