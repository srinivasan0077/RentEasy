import { useState, useRef } from 'react';
import { Upload, X, FileText, Image, Eye } from 'lucide-react';

/**
 * Reusable file upload component for RentEasy
 * Supports drag-and-drop, preview, and Supabase Storage upload
 *
 * Props:
 *  - label: string (display label)
 *  - accept: string (e.g., 'image/*,.pdf')
 *  - maxSizeMB: number (default 5)
 *  - currentUrl: string (existing file URL)
 *  - onUpload: (file: File) => Promise<string> (returns uploaded URL)
 *  - onRemove: () => void
 *  - disabled: boolean
 */
export default function FileUpload({
  label = 'Upload File',
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  maxSizeMB = 5,
  currentUrl = '',
  onUpload,
  onRemove,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const isImage = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes('image');
  };

  const handleFile = async (file) => {
    setError('');

    if (!file) return;

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Maximum ${maxSizeMB}MB allowed.`);
      return;
    }

    // Validate type
    const allowedTypes = accept.split(',').map(t => t.trim());
    const typeMatch = allowedTypes.some(t => {
      if (t === 'image/*') return file.type.startsWith('image/');
      if (t.startsWith('.')) return file.name.toLowerCase().endsWith(t);
      return file.type === t;
    });

    if (!typeMatch) {
      setError('File type not supported. Use JPEG, PNG, WebP, or PDF.');
      return;
    }

    setUploading(true);
    try {
      await onUpload?.(file);
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div style={{ marginBottom: '4px' }}>
      <label className="form-label">{label}</label>

      {currentUrl ? (
        // File already uploaded — show preview
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '10px',
          border: '1px solid var(--gray-200)',
        }}>
          {isImage(currentUrl) ? (
            <img
              src={currentUrl}
              alt={label}
              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--gray-200)' }}
            />
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '8px',
              background: '#eef2ff', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={22} />
            </div>
          )}
          <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
            File uploaded ✅
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
              title="View file"
              style={{ padding: '4px 8px' }}
            >
              <Eye size={14} />
            </a>
            {!disabled && onRemove && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={onRemove}
                title="Remove file"
                style={{ padding: '4px 8px', color: 'var(--danger)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        // Upload zone
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            padding: '20px', textAlign: 'center', borderRadius: '10px',
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--gray-200)'}`,
            background: dragOver ? '#eef2ff' : 'var(--gray-50)',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            style={{ display: 'none' }}
            disabled={disabled || uploading}
          />
          {uploading ? (
            <div style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '4px' }}>⏳ Uploading...</div>
            </div>
          ) : (
            <>
              <div style={{ color: 'var(--gray-400)', marginBottom: '4px' }}>
                {dragOver ? <Image size={24} /> : <Upload size={24} />}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                {dragOver ? 'Drop file here' : 'Click or drag file to upload'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-300)', marginTop: '4px' }}>
                JPEG, PNG, WebP, PDF • Max {maxSizeMB}MB
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
