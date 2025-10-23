import React from 'react';
import './MedicineCard.css';

const MedicineCard = ({ advice, onClose, onEdit }) => {
  if (!advice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{advice.name || 'Medicine Details'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {advice.desese_description && (
            <div className="detail-section">
              <h4>Description</h4>
              <p>{advice.desese_description}</p>
            </div>
          )}

          {advice.symptoms?.length > 0 && (
            <div className="detail-section">
              <h4>Symptoms</h4>
              <div className="tags-container">
                {advice.symptoms.map((symptom, i) => (
                  <span key={i} className="tag">{symptom}</span>
                ))}
              </div>
            </div>
          )}

          {advice.medicines?.length > 0 && (
            <div className="detail-section">
              <h4>Medicines</h4>
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Dose</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {advice.medicines.map((med, i) => (
                    <tr key={i}>
                      <td>{med.name}</td>
                      <td>{med.type}</td>
                      <td>{med.dose}</td>
                      <td>{med.frequency}</td>
                      <td>{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {advice.testAdvice?.length > 0 && (
            <div className="detail-section">
              <h4>Test Advice</h4>
              <ul className="test-list">
                {advice.testAdvice.map((test, i) => (
                  <li key={i}>{test.testName}</li>
                ))}
              </ul>
            </div>
          )}

          {advice.tags?.length > 0 && (
            <div className="detail-section">
              <h4>Tags</h4>
              <div className="tags-container">
                {advice.tags.map((tag, i) => (
                  <span key={i} className="tag tag-blue">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Close</button>
          <button className="btn add-btn" onClick={() => {
            onEdit(advice);
            onClose();
          }}>
            Edit Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicineCard;