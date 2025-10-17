import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceViewer from './InvoiceViewer';

const InvoicePage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16, padding: '6px 16px', background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Back</button>
      <InvoiceViewer invoiceId={invoiceId} isOpen={true} onClose={() => navigate(-1)} />
    </div>
  );
};

export default InvoicePage;
