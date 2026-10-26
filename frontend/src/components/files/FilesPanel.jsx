import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  File,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import api from '../../services/api';

export default function FilesPanel({ roomId, userSession, isOwner }) {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const loadFiles = async () => {
    try {
      const res = await api.getFiles(roomId);
      setFiles(res.files || []);
    } catch (e) {
      console.error('Failed to load shared files:', e);
    }
  };

  useEffect(() => {
    if (roomId) loadFiles();
  }, [roomId]);

  const handleFileUpload = async (fileObj) => {
    if (!fileObj) return;

    try {
      setIsUploading(true);
      setUploadProgress(`Uploading ${fileObj.name}...`);

      const formData = new FormData();
      formData.append('file', fileObj);

      await api.uploadFile(roomId, formData);
      setUploadProgress('Upload complete!');
      setTimeout(() => setUploadProgress(null), 2000);
      await loadFiles();
    } catch (e) {
      alert('Upload failed: ' + e.message);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this shared file?')) return;
    try {
      await api.deleteFile(roomId, fileId);
      await loadFiles();
    } catch (e) {
      alert('Failed to delete file: ' + e.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter((f) =>
    f.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HardDrive size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Shared Files Repository</h3>
        </div>
        <span className="badge badge-secondary">{files.length} Files</span>
      </div>

      <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Drag & Drop Upload Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          style={{
            border: dragOver ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem 1rem',
            textAlign: 'center',
            backgroundColor: dragOver ? 'var(--bg-hover)' : 'var(--bg-panel)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('file-input-uploader')?.click()}
        >
          <UploadCloud size={32} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Drop files here or click to browse
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Supports documents, assets, datasets, and archives up to 25MB. Files expire with the room.
          </p>
          <input
            id="file-input-uploader"
            type="file"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
            style={{ display: 'none' }}
          />

          {uploadProgress && (
            <div className="badge badge-primary" style={{ marginTop: '0.75rem' }}>
              {uploadProgress}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search shared files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Files List */}
        <div>
          {filteredFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No files uploaded yet in this room.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredFiles.map((f) => {
                const canDelete = isOwner || f.uploaded_by_session_id === userSession?.sessionId;
                const uploadDate = new Date(f.created_at).toLocaleString();

                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <File size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.original_filename}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatBytes(f.size_bytes)} • Uploaded by {f.uploaded_by_name} • {uploadDate}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <a
                        href={api.getFileDownloadUrl(roomId, f.id)}
                        download
                        className="btn btn-secondary btn-icon sm"
                        title="Download file"
                      >
                        <Download size={14} />
                      </a>
                      {canDelete && (
                        <button
                          className="btn btn-subtle btn-icon sm"
                          onClick={() => handleDelete(f.id)}
                          title="Delete file"
                        >
                          <Trash2 size={14} color="var(--state-error)" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
