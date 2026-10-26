import React, { useState, useEffect } from 'react';
import { X, Sparkles, Code, Check, Search, AlertCircle } from 'lucide-react';
import { TEMPLATES, getTemplatesForLanguage, detectLanguageFromPath } from '../../utils/templates';

export default function TemplatePickerModal({
  activeFilePath,
  currentFileContent,
  onInsertTemplate,
  onClose
}) {
  const defaultLang = detectLanguageFromPath(activeFilePath);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLang);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const priorityLangs = ['python', 'c', 'html', 'react', 'javascript', 'css'];
  const allLangs = Object.keys(TEMPLATES);
  const availableLanguages = [
    ...priorityLangs.filter(l => allLangs.includes(l)),
    ...allLangs.filter(l => !priorityLangs.includes(l))
  ];
  const templates = getTemplatesForLanguage(selectedLanguage);

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (filteredTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(filteredTemplates[0]);
    } else if (filteredTemplates.length > 0 && !filteredTemplates.some(t => t.id === selectedTemplate?.id)) {
      setSelectedTemplate(filteredTemplates[0]);
    }
  }, [selectedLanguage, searchQuery]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleApply = () => {
    if (!selectedTemplate) return;

    // Check if active file has existing non-empty content
    if (currentFileContent && currentFileContent.trim().length > 0 && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true);
      return;
    }

    onInsertTemplate(selectedTemplate.content);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', height: '600px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <h3 className="modal-title">Universal Starter Templates</h3>
            <span className="badge badge-primary">Shift + !</span>
          </div>
          <button className="btn btn-subtle btn-icon sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', height: 'calc(100% - 110px)', overflow: 'hidden' }}>
          {/* Left Sidebar: Language and Template List */}
          <div style={{ width: '320px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select
                className="form-select"
                style={{ fontSize: '0.825rem', padding: '0.45rem' }}
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {availableLanguages.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8rem', paddingLeft: '30px', padding: '0.4rem 0.5rem 0.4rem 28px' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t);
                    setShowOverwriteConfirm(false);
                  }}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.35rem',
                    cursor: 'pointer',
                    backgroundColor: selectedTemplate?.id === t.id ? 'var(--bg-active)' : 'transparent',
                    border: selectedTemplate?.id === t.id ? '1px solid var(--accent-primary-glow)' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{t.name}</strong>
                    <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{t.category}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Area: Template Code Preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
            {selectedTemplate ? (
              <>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-panel)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedTemplate.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Language: {selectedLanguage.toUpperCase()}
                    </span>
                  </div>
                  <span className="badge badge-primary">{selectedTemplate.category}</span>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '1rem', backgroundColor: '#0B0D12' }}>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: '#F4F6FB', lineHeight: 1.5 }}>
                    <code>{selectedTemplate.content}</code>
                  </pre>
                </div>

                {showOverwriteConfirm && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--state-warning-bg)', borderTop: '1px solid var(--state-warning)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={18} color="var(--state-warning)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--state-warning)' }}>
                      The active file is not empty. Inserting this starter template will replace existing code.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No template selected
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-sm ${showOverwriteConfirm ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleApply}
            disabled={!selectedTemplate}
          >
            <Check size={16} />
            <span>{showOverwriteConfirm ? 'Confirm Replace Code' : 'Insert Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
