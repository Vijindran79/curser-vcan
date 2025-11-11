import React, { useCallback, useState } from 'react';
import { storage, db } from '../../firebase';

type Props = {
  userId: string;
  shipmentId: string;
  documentId: string;
  onUploaded?: (meta: any) => void;
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const DocumentUpload: React.FC<Props> = ({ userId, shipmentId, documentId, onUploaded }) => {
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    setError('');
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF, JPG, PNG, DOC, or DOCX.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Max size is 10MB.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const objectPath = `documents/${userId}/${shipmentId}/${documentId}.${ext}`;
      const ref = storage?.ref?.().child(objectPath);
      if (!ref) {
        throw new Error('Storage not initialized');
      }
      const task = ref.put(file, { contentType: file.type });
      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          },
          err => reject(err),
          () => resolve()
        );
      });
      const downloadURL = await ref.getDownloadURL();
      const meta = {
        userId,
        shipmentId,
        documentId,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        storagePath: objectPath,
        downloadURL,
        uploadedAt: new Date().toISOString()
      };
      await db.collection('shipment_documents').add(meta);
      onUploaded?.(meta);
      setProgress(100);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [userId, shipmentId, documentId, onUploaded]);

  return (
    <div style={{ border: '2px dashed #e5e7eb', padding: 16, borderRadius: 8 }}>
      <input
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={e => handleFiles(e.target.files)}
        disabled={uploading}
      />
      {uploading && <div>Uploading... {progress}%</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
        Accepted: PDF, JPG, PNG, DOC, DOCX. Max 10MB.
      </div>
    </div>
  );
};

export default DocumentUpload;

