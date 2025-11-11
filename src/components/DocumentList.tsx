import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';

type Props = {
  shipmentId: string;
  onEmail?: (doc: any) => void;
};

export const DocumentList: React.FC<Props> = ({ shipmentId, onEmail }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsub: any;
    (async () => {
      setLoading(true);
      unsub = db.collection('shipment_documents')
        .where('shipmentId', '==', shipmentId)
        .orderBy('uploadedAt', 'desc')
        .onSnapshot((snap: any) => {
          const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          setDocs(items);
          setLoading(false);
        });
    })();
    return () => unsub && unsub();
  }, [shipmentId]);

  if (loading) return <div>Loading documents...</div>;

  if (docs.length === 0) return <div>No documents uploaded yet.</div>;

  return (
    <div>
      {docs.map(doc => (
        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{doc.documentId}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{doc.fileName} • {Math.round(doc.size / 1024)} KB</div>
          </div>
          <button onClick={() => window.open(doc.downloadURL, '_blank')}>View</button>
          <a href={doc.downloadURL} download target="_blank" rel="noreferrer"><button>Download</button></a>
          <button onClick={() => {
            const win = window.open(doc.downloadURL, '_blank');
            const timer = setInterval(() => {
              try {
                win?.print();
                clearInterval(timer);
              } catch {}
            }, 400);
          }}>Print</button>
          {onEmail && <button onClick={() => onEmail(doc)}>Email</button>}
        </div>
      ))}
    </div>
  );
};

export default DocumentList;

