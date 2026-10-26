import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FilePlus,
  FolderPlus,
  Download,
  Upload,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  FileText,
  User,
  Lock,
  Copy,
  Scissors,
  ClipboardPaste,
  CheckSquare,
  Square,
  X,
  CornerDownRight,
  Check,
  Image as ImageIcon
} from 'lucide-react';
import { processDroppedItems, readFileData, isRejectedDocument } from '../../utils/fileDropHelper';

/**
 * Builds a hierarchical tree structure from a flat array of workspace files
 */
function buildTree(files) {
  const dirPaths = new Set();

  // Collect all directories explicitly or inferred from paths
  files.forEach((f) => {
    const clean = f.path.replace(/^\.?\/+/, '');
    if (f.is_directory) {
      dirPaths.add(clean);
    }
    const parts = clean.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirPaths.add(parts.slice(0, i).join('/'));
    }
  });

  const root = { path: '', isDir: true, children: [] };
  const map = { '': root };

  // Create folder nodes sorted by path depth
  const sortedDirs = Array.from(dirPaths).sort(
    (a, b) => a.split('/').length - b.split('/').length
  );

  sortedDirs.forEach((dirPath) => {
    const parts = dirPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const node = {
      id: `dir_${dirPath}`,
      name,
      path: dirPath,
      isDir: true,
      children: []
    };
    map[dirPath] = node;
    const parent = map[parentPath] || root;
    parent.children.push(node);
  });

  // Add file nodes
  files.forEach((f) => {
    if (f.is_directory) return;
    const clean = f.path.replace(/^\.?\/+/, '');
    const parts = clean.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const node = {
      ...f,
      name,
      path: clean,
      isDir: false
    };
    const parent = map[parentPath] || root;
    parent.children.push(node);
  });

  // Sort folders first, then files alphabetically
  function sortChildren(node) {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    node.children.forEach(sortChildren);
  }

  sortChildren(root);
  return root;
}

/**
 * Flattens the tree into a linear list of visible nodes respecting collapsed folders
 */
function flattenTree(root, collapsedFolders, depth = 0) {
  let list = [];
  if (!root.children) return list;
  for (const child of root.children) {
    list.push({ ...child, depth });
    if (child.isDir && !collapsedFolders[child.path]) {
      list = list.concat(flattenTree(child, collapsedFolders, depth + 1));
    }
  }
  return list;
}

export default function FileExplorer({
  files = [],
  activeFilePath = '',
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onBatchMove,
  onBatchCopy,
  onExportZip,
  onImportZip,
  onDropFiles,
  collaborators = [],
  isEditingLocked = false,
  lockedFiles = [],
  onToggleFileLock,
  isOwner = false,
  onCloseExplorer
}) {
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState(null);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState(null);

  // Clipboard state: { action: 'cut' | 'copy', paths: string[] }
  const [clipboard, setClipboard] = useState(null);

  // Creation state
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createTargetFolder, setCreateTargetFolder] = useState(''); // '' for root, or folder path
  const [newItemName, setNewItemName] = useState('');

  // Rename state
  const [editingPath, setEditingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item }

  const explorerRef = useRef(null);
  const canEdit = !isEditingLocked || isOwner;

  // Build tree and visible flattened list
  const treeRoot = buildTree(files);
  const visibleNodes = flattenTree(treeRoot, collapsedFolders);

  const toggleFolder = (folderPath) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Global Explorer Keyboard Shortcuts (Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allPaths = new Set(files.map((f) => f.path.replace(/^\.?\/+/, '')));
        setSelectedPaths(allPaths);
      } else if (modKey && e.key.toLowerCase() === 'c' && selectedPaths.size > 0) {
        e.preventDefault();
        handleCopySelected();
      } else if (modKey && e.key.toLowerCase() === 'x' && selectedPaths.size > 0 && canEdit) {
        e.preventDefault();
        handleCutSelected();
      } else if (modKey && e.key.toLowerCase() === 'v' && clipboard && canEdit) {
        e.preventDefault();
        // Paste into currently selected single folder, or parent folder of selected file, or root
        let target = '';
        if (selectedPaths.size === 1) {
          const single = Array.from(selectedPaths)[0];
          const node = visibleNodes.find((n) => n.path === single);
          if (node) {
            target = node.isDir ? node.path : (node.path.includes('/') ? node.path.split('/').slice(0, -1).join('/') : '');
          }
        }
        handlePasteIntoFolder(target);
      } else if (e.key === 'Escape') {
        setSelectedPaths(new Set());
        setClipboard(null);
        setContextMenu(null);
        setIsCreatingFile(false);
        setIsCreatingFolder(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPaths, clipboard, canEdit, files, visibleNodes]);

  // Click Handler with Shift (Range) & Ctrl (Toggle) selection
  const handleNodeClick = (e, node) => {
    if (e.shiftKey && lastSelectedPath) {
      e.preventDefault();
      // Range selection between lastSelectedPath and current node in visible list
      const indexA = visibleNodes.findIndex((n) => n.path === lastSelectedPath);
      const indexB = visibleNodes.findIndex((n) => n.path === node.path);

      if (indexA !== -1 && indexB !== -1) {
        const start = Math.min(indexA, indexB);
        const end = Math.max(indexA, indexB);
        const rangePaths = visibleNodes.slice(start, end + 1).map((n) => n.path);
        setSelectedPaths(new Set([...selectedPaths, ...rangePaths]));
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Toggle selection for this item
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(node.path)) next.delete(node.path);
        else next.add(node.path);
        return next;
      });
      setLastSelectedPath(node.path);
      return;
    }

    // Standard click without modifier: single select
    setSelectedPaths(new Set([node.path]));
    setLastSelectedPath(node.path);

    if (node.isDir) {
      toggleFolder(node.path);
    } else {
      onSelectFile(node.path);
    }
  };

  // Open context menu
  const handleContextMenu = (e, node) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedPaths.has(node.path)) {
      setSelectedPaths(new Set([node.path]));
      setLastSelectedPath(node.path);
    }

    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 240),
      item: node
    });
  };

  // Context menu on empty background of explorer
  const handlePaneContextMenu = (e) => {
    if (e.target.closest('.tree-node')) return;
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 200),
      item: null // root
    });
  };

  // Cut Selected
  const handleCutSelected = () => {
    if (selectedPaths.size === 0 || !canEdit) return;
    setClipboard({
      action: 'cut',
      paths: Array.from(selectedPaths)
    });
    setContextMenu(null);
  };

  // Copy Selected
  const handleCopySelected = () => {
    if (selectedPaths.size === 0) return;
    setClipboard({
      action: 'copy',
      paths: Array.from(selectedPaths)
    });
    setContextMenu(null);
  };

  // Paste into specified folder (or root '')
  const handlePasteIntoFolder = async (targetFolder = '') => {
    if (!clipboard || !clipboard.paths || clipboard.paths.length === 0 || !canEdit) return;
    setContextMenu(null);

    const cleanTarget = targetFolder.replace(/^\.?\/+/, '');

    try {
      if (clipboard.action === 'cut') {
        if (onBatchMove) {
          await onBatchMove(clipboard.paths, cleanTarget);
        }
        // Expand the target folder so moved files are visible
        if (cleanTarget) {
          setCollapsedFolders((prev) => ({ ...prev, [cleanTarget]: false }));
        }
        setClipboard(null);
        setSelectedPaths(new Set());
      } else if (clipboard.action === 'copy') {
        if (onBatchCopy) {
          await onBatchCopy(clipboard.paths, cleanTarget);
        }
        if (cleanTarget) {
          setCollapsedFolders((prev) => ({ ...prev, [cleanTarget]: false }));
        }
        setSelectedPaths(new Set());
      }
    } catch (err) {
      console.error('[FileExplorer] Paste error:', err);
    }
  };

  // Delete Selected files
  const handleDeleteSelected = () => {
    if (selectedPaths.size === 0 || !canEdit) return;
    const count = selectedPaths.size;
    const msg = count === 1
      ? `Delete '${Array.from(selectedPaths)[0]}' ?`
      : `Delete ${count} selected files and folders?`;

    if (confirm(msg)) {
      selectedPaths.forEach((path) => {
        onDelete(path);
      });
      setSelectedPaths(new Set());
      setContextMenu(null);
    }
  };

  // Start creation inside a target folder (or root)
  const startCreate = (type, targetFolder = '') => {
    if (!canEdit) return;
    setCreateTargetFolder(targetFolder);
    if (targetFolder) {
      setCollapsedFolders((prev) => ({ ...prev, [targetFolder]: false }));
    }
    if (type === 'file') {
      setIsCreatingFile(true);
      setIsCreatingFolder(false);
    } else {
      setIsCreatingFolder(true);
      setIsCreatingFile(false);
    }
    setNewItemName('');
    setContextMenu(null);
  };

  // Submit file/folder creation
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name || !canEdit) return;

    const fullPath = createTargetFolder
      ? `${createTargetFolder.replace(/^\.?\/+/, '')}/${name.replace(/^\.?\/+/, '')}`
      : name.replace(/^\.?\/+/, '');

    if (isCreatingFile) {
      onCreateFile(fullPath);
      setIsCreatingFile(false);
    } else if (isCreatingFolder) {
      onCreateFolder(fullPath);
      setIsCreatingFolder(false);
    }
    setNewItemName('');
    setCreateTargetFolder('');
  };

  // Rename submit
  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (editingPath && renameValue.trim() && canEdit) {
      const cleanNew = renameValue.trim().replace(/^\.?\/+/, '');
      onRename(editingPath, cleanNew);
      setEditingPath(null);
      setRenameValue('');
    }
  };

  const handleMultipleFilesUpload = async (e) => {
    if (!canEdit) return;
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    let rejectedCount = 0;
    const processed = [];

    for (const file of rawFiles) {
      if (isRejectedDocument(file.name)) {
        rejectedCount++;
        continue;
      }

      try {
        const content = await readFileData(file);
        processed.push({
          path: file.name,
          content,
          isDirectory: false
        });
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    if (rejectedCount > 0) {
      alert(`Document files (.docx, .pdf, .ppt) are not supported in the code editor workspace. ${rejectedCount} document file(s) were excluded. Please upload documents in the Shared Files tab instead.`);
    }

    if (processed.length > 0 && onDropFiles) {
      await onDropFiles(processed, createTargetFolder || '');
    }

    e.target.value = '';
  };

  // Get file icon based on extension
  const getFileIcon = (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return <FileCode size={15} color="#E44D26" />;
      case 'css':
        return <FileCode size={15} color="#264DE4" />;
      case 'js':
        return <FileCode size={15} color="#F7DF1E" />;
      case 'jsx':
        return <FileCode size={15} color="#00D8FF" />;
      case 'ts':
      case 'tsx':
        return <FileCode size={15} color="#3178C6" />;
      case 'py':
        return <FileCode size={15} color="#3776AB" />;
      case 'c':
      case 'h':
        return <FileCode size={15} color="#A8B9CC" />;
      case 'json':
        return <FileCode size={15} color="#3DDC97" />;
      case 'md':
        return <FileText size={15} color="#A2A9B8" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
      case 'ico':
      case 'bmp':
        return <ImageIcon size={15} color="#A78BFA" />;
      case 'svg':
        return <ImageIcon size={15} color="#F59E0B" />;
      default:
        return <FileText size={15} color="var(--text-muted)" />;
    }
  };

  // Determine target folder name for display
  const targetFolderDisplayName = createTargetFolder ? `${createTargetFolder}/` : 'root /';

  return (
    <div
      className={`file-explorer-pane ${isDraggingOver ? 'dragging-over' : ''}`}
      ref={explorerRef}
      onContextMenu={handlePaneContextMenu}
      onDragEnter={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!isDraggingOver) setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (!explorerRef.current?.contains(e.relatedTarget)) {
          setIsDraggingOver(false);
          setDragOverFolder(null);
        }
      }}
      onDrop={async (e) => {
        if (!canEdit) return;
        e.preventDefault();
        e.stopPropagation();
        const target = dragOverFolder || '';
        setIsDraggingOver(false);
        setDragOverFolder(null);
        try {
          const items = await processDroppedItems(e, target);
          if (items && items.length > 0 && onDropFiles) {
            await onDropFiles(items, target);
          }
        } catch (err) {
          console.error('File drop error in explorer:', err);
        }
      }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none', position: 'relative' }}
    >
      {/* Explorer Header */}
      <div className="explorer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="explorer-title">Files</span>
          {onCloseExplorer && (
            <button
              className="btn btn-subtle btn-icon sm show-on-mobile"
              style={{ width: '22px', height: '22px', padding: 0 }}
              onClick={onCloseExplorer}
              title="Swipe left or click to close Files"
            >
              <X size={13} />
            </button>
          )}
          {isEditingLocked && (
            <span title="Editing is locked by host" style={{ display: 'inline-flex', color: 'var(--state-warning)' }}>
              <Lock size={12} />
            </span>
          )}
        </div>
        <div className="explorer-actions">
          {canEdit ? (
            <>
              <button
                className="btn btn-subtle btn-icon sm"
                onClick={() => startCreate('file', '')}
                title="New File (Root)"
              >
                <FilePlus size={14} />
              </button>
              <button
                className="btn btn-subtle btn-icon sm"
                onClick={() => startCreate('folder', '')}
                title="New Folder (Root)"
              >
                <FolderPlus size={14} />
              </button>
            </>
          ) : null}
          <button
            className="btn btn-subtle btn-icon sm"
            onClick={onExportZip}
            title="Export Project as ZIP"
          >
            <Download size={14} />
          </button>
          {canEdit && (
            <label
              className="btn btn-subtle btn-icon sm"
              title="Upload Files (Multiple text, code, or image files)"
              style={{ cursor: 'pointer', margin: 0 }}
            >
              <Upload size={14} />
              <input
                type="file"
                multiple
                accept=".txt,.html,.htm,.css,.js,.jsx,.ts,.tsx,.json,.py,.c,.h,.cpp,.md,.markdown,.svg,.png,.jpg,.jpeg,.gif,.webp,.ico,.xml,.yaml,.yml"
                onChange={handleMultipleFilesUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Mention Cut, Copy & Paste Supported */}
      <div
        className="file-explorer-hint-banner"
        style={{
          padding: '5px 12px',
          fontSize: '0.73rem',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        title="Cut (Ctrl+X) or Copy (Ctrl+C) files and paste (Ctrl+V) into any folder, or use right-click context menu."
      >
        <Scissors size={12} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Cut (Ctrl+X) &amp; Paste (Ctrl+V) supported here
        </span>
      </div>

      {/* Multi-Selection Action Bar (Shift + Click or Multi-select) */}
      {selectedPaths.size > 1 && (
        <div className="explorer-selection-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              {selectedPaths.size}
            </span>
            <span>selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {canEdit && (
              <button
                className="btn btn-subtle btn-sm"
                style={{ padding: '1px 6px', fontSize: '0.72rem', height: '22px' }}
                onClick={handleCutSelected}
                title="Cut selected files (Ctrl+X)"
              >
                <Scissors size={12} />
                <span>Cut</span>
              </button>
            )}
            <button
              className="btn btn-subtle btn-sm"
              style={{ padding: '1px 6px', fontSize: '0.72rem', height: '22px' }}
              onClick={handleCopySelected}
              title="Copy selected files (Ctrl+C)"
            >
              <Copy size={12} />
              <span>Copy</span>
            </button>
            {canEdit && (
              <button
                className="btn btn-subtle btn-sm"
                style={{ padding: '1px 6px', fontSize: '0.72rem', height: '22px', color: 'var(--state-error)' }}
                onClick={handleDeleteSelected}
                title="Delete selected files"
              >
                <Trash2 size={12} />
              </button>
            )}
            <button
              className="btn btn-subtle btn-icon sm"
              style={{ width: '20px', height: '20px' }}
              onClick={() => setSelectedPaths(new Set())}
              title="Clear selection (Esc)"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Inline Create Input (Supports creating inside any folder or root) */}
      {(isCreatingFile || isCreatingFolder) && (
        <form
          onSubmit={handleCreateSubmit}
          style={{
            padding: '0.4rem 0.6rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            animation: 'fadeIn 0.12s ease'
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CornerDownRight size={11} color="var(--accent-primary)" />
            <span>Create in: <strong>{targetFolderDisplayName}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isCreatingFolder ? <Folder size={14} color="var(--accent-primary)" /> : <FileCode size={14} color="var(--accent-primary)" />}
            <input
              type="text"
              autoFocus
              placeholder={isCreatingFolder ? 'folder-name' : 'filename.ext'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsCreatingFile(false);
                  setIsCreatingFolder(false);
                }
              }}
              style={{
                width: '100%',
                background: 'var(--bg-panel)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                padding: '3px 6px',
                outline: 'none'
              }}
            />
          </div>
        </form>
      )}

      {/* Hierarchical File Tree List */}
      <div className="explorer-tree" style={{ flex: 1, overflowY: 'auto' }}>
        {isDraggingOver && !dragOverFolder && (
          <div className="explorer-dropzone-banner">
            <Upload size={13} />
            <span>Drop files or images here to upload to Project Root</span>
          </div>
        )}
        {visibleNodes.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No files in workspace.<br />
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => startCreate('file', '')}>
              + Click to create a file
            </span>
          </div>
        ) : (
          visibleNodes.map((node) => {
            const isEditing = editingPath === node.path;
            const isActive = activeFilePath === node.path;
            const isSelected = selectedPaths.has(node.path);
            const isCut = clipboard?.action === 'cut' && clipboard.paths.includes(node.path);
            const isDir = node.isDir;
            const isDropTarget = isDir && dragOverFolder === node.path;
            const viewers = collaborators.filter((c) => c.path === node.path);
            const isFileLocked = (lockedFiles || []).includes('*') || (lockedFiles || []).includes(node.path);

            return (
              <div
                key={node.path}
                className={`tree-node ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isCut ? 'cut' : ''} ${isDropTarget ? 'drop-target-active' : ''}`}
                style={{
                  paddingLeft: `${node.depth * 14 + 10}px`,
                  position: 'relative'
                }}
                onClick={(e) => handleNodeClick(e, node)}
                onContextMenu={(e) => handleContextMenu(e, node)}
                onDragOver={isDir ? (e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  if (dragOverFolder !== node.path) {
                    setDragOverFolder(node.path);
                  }
                } : undefined}
                onDragLeave={isDir ? (e) => {
                  e.stopPropagation();
                  if (dragOverFolder === node.path) {
                    setDragOverFolder(null);
                  }
                } : undefined}
                onDrop={isDir ? async (e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const target = node.path;
                  setIsDraggingOver(false);
                  setDragOverFolder(null);
                  try {
                    const items = await processDroppedItems(e, target);
                    if (items && items.length > 0 && onDropFiles) {
                      await onDropFiles(items, target);
                    }
                  } catch (err) {
                    console.error('File drop error on folder:', err);
                  }
                } : undefined}
                title={node.path}
              >
                {isEditing ? (
                  <form onSubmit={handleRenameSubmit} style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setEditingPath(null)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: '3px',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        padding: '1px 4px',
                        outline: 'none'
                      }}
                    />
                  </form>
                ) : (
                  <>
                    <div className="tree-node-content">
                      {isDir ? (
                        <>
                          {collapsedFolders[node.path] ? <ChevronRight size={13} style={{ flexShrink: 0 }} /> : <ChevronDown size={13} style={{ flexShrink: 0 }} />}
                          {collapsedFolders[node.path] ? (
                            <Folder size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          ) : (
                            <FolderOpen size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          )}
                        </>
                      ) : (
                        getFileIcon(node.path)
                      )}

                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {node.name}
                      </span>

                      {isFileLocked && (
                        <Lock
                          size={11}
                          color="var(--state-warning, #f59e0b)"
                          style={{ marginLeft: '4px', flexShrink: 0 }}
                          title="This file is locked by host"
                        />
                      )}
                    </div>

                    {/* Active Viewers on this file */}
                    {viewers.length > 0 && (
                      <span
                        className="tab-collaborator-pill"
                        title={`${viewers.map((v) => v.displayName).join(', ')} viewing`}
                        style={{ marginLeft: 'auto', marginRight: '4px' }}
                      >
                        <User size={9} />
                        {viewers[0].displayName}
                        {viewers.length > 1 && ` +${viewers.length - 1}`}
                      </span>
                    )}

                    {/* Action buttons on hover */}
                    <div className="tree-node-actions" onClick={(e) => e.stopPropagation()}>
                      {/* Inside folder creation buttons */}
                      {isDir && canEdit && (
                        <>
                          <button
                            className="btn-icon sm btn-subtle"
                            onClick={() => startCreate('file', node.path)}
                            title={`New File inside ${node.name}`}
                          >
                            <FilePlus size={12} color="var(--accent-primary)" />
                          </button>
                          <button
                            className="btn-icon sm btn-subtle"
                            onClick={() => startCreate('folder', node.path)}
                            title={`New Subfolder inside ${node.name}`}
                          >
                            <FolderPlus size={12} color="var(--accent-primary)" />
                          </button>
                          {/* Paste button on folder if clipboard is active */}
                          {clipboard && clipboard.paths.length > 0 && (
                            <button
                              className="btn-icon sm btn-subtle"
                              onClick={() => handlePasteIntoFolder(node.path)}
                              title={`Paste ${clipboard.paths.length} items into ${node.name}`}
                              style={{ color: 'var(--state-success, #3ddc97)' }}
                            >
                              <ClipboardPaste size={13} />
                            </button>
                          )}
                        </>
                      )}

                      {/* Lock Toggle (Owner) */}
                      {isOwner && !isDir && (
                        <button
                          className="btn-icon sm btn-subtle"
                          onClick={() => onToggleFileLock?.(node.path, !isFileLocked)}
                          title={isFileLocked ? 'Unlock this file' : 'Lock this file for participants'}
                          style={{ color: isFileLocked ? 'var(--state-warning, #f59e0b)' : 'var(--text-muted)' }}
                        >
                          <Lock size={12} />
                        </button>
                      )}

                      {/* Rename and Delete */}
                      {canEdit && (
                        <>
                          <button
                            className="btn-icon sm btn-subtle"
                            onClick={() => {
                              setEditingPath(node.path);
                              setRenameValue(node.path);
                            }}
                            title="Rename"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn-icon sm btn-subtle"
                            onClick={() => {
                              if (confirm(`Delete '${node.path}'?`)) {
                                onDelete(node.path);
                              }
                            }}
                            title="Delete"
                          >
                            <Trash2 size={12} color="var(--state-error)" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Active Clipboard Floating Banner */}
      {clipboard && clipboard.paths.length > 0 && (
        <div className="explorer-clipboard-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            {clipboard.action === 'cut' ? (
              <Scissors size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            ) : (
              <Copy size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong>{clipboard.action === 'cut' ? 'Cut' : 'Copied'}:</strong> {clipboard.paths.length} {clipboard.paths.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '2px 8px', fontSize: '0.72rem', height: '24px' }}
              onClick={() => {
                // If a single folder is currently selected, paste into it; otherwise paste into root
                let target = '';
                if (selectedPaths.size === 1) {
                  const single = Array.from(selectedPaths)[0];
                  const node = visibleNodes.find((n) => n.path === single);
                  if (node?.isDir) target = node.path;
                }
                handlePasteIntoFolder(target);
              }}
              title="Paste items into selected folder or root"
            >
              <ClipboardPaste size={12} />
              <span>Paste {selectedPaths.size === 1 && visibleNodes.find(n => n.path === Array.from(selectedPaths)[0])?.isDir ? 'Here' : 'Root'}</span>
            </button>
            <button
              className="btn btn-subtle btn-icon sm"
              style={{ width: '22px', height: '22px' }}
              onClick={() => setClipboard(null)}
              title="Cancel clipboard (Esc)"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Glassmorphic Context Menu */}
      {contextMenu && (
        <div
          className="explorer-context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item?.isDir ? (
            <>
              {canEdit && (
                <>
                  <button className="context-menu-item" onClick={() => startCreate('file', contextMenu.item.path)}>
                    <FilePlus size={13} color="var(--accent-primary)" />
                    <span>New File in {contextMenu.item.name}</span>
                  </button>
                  <button className="context-menu-item" onClick={() => startCreate('folder', contextMenu.item.path)}>
                    <FolderPlus size={13} color="var(--accent-primary)" />
                    <span>New Subfolder</span>
                  </button>
                  {clipboard && (
                    <button className="context-menu-item" onClick={() => handlePasteIntoFolder(contextMenu.item.path)}>
                      <ClipboardPaste size={13} color="var(--state-success, #3ddc97)" />
                      <span>Paste into '{contextMenu.item.name}' ({clipboard.paths.length})</span>
                    </button>
                  )}
                  <div className="context-menu-divider" />
                </>
              )}
            </>
          ) : null}

          {/* If clicked on empty space */}
          {!contextMenu.item && canEdit && (
            <>
              <button className="context-menu-item" onClick={() => startCreate('file', '')}>
                <FilePlus size={13} color="var(--accent-primary)" />
                <span>New File (Root)</span>
              </button>
              <button className="context-menu-item" onClick={() => startCreate('folder', '')}>
                <FolderPlus size={13} color="var(--accent-primary)" />
                <span>New Folder (Root)</span>
              </button>
              {clipboard && (
                <button className="context-menu-item" onClick={() => handlePasteIntoFolder('')}>
                  <ClipboardPaste size={13} color="var(--state-success, #3ddc97)" />
                  <span>Paste into Root ({clipboard.paths.length})</span>
                </button>
              )}
              <div className="context-menu-divider" />
            </>
          )}

          {/* Cut / Copy actions */}
          {selectedPaths.size > 0 && (
            <>
              {canEdit && (
                <button className="context-menu-item" onClick={handleCutSelected}>
                  <Scissors size={13} />
                  <span>Cut ({selectedPaths.size})</span>
                </button>
              )}
              <button className="context-menu-item" onClick={handleCopySelected}>
                <Copy size={13} />
                <span>Copy ({selectedPaths.size})</span>
              </button>
              <div className="context-menu-divider" />
            </>
          )}

          {/* Rename & Delete */}
          {contextMenu.item && canEdit && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  setEditingPath(contextMenu.item.path);
                  setRenameValue(contextMenu.item.path);
                  setContextMenu(null);
                }}
              >
                <Edit2 size={13} />
                <span>Rename</span>
              </button>
              <button
                className="context-menu-item"
                style={{ color: 'var(--state-error)' }}
                onClick={() => {
                  if (confirm(`Delete '${contextMenu.item.path}'?`)) {
                    onDelete(contextMenu.item.path);
                    setContextMenu(null);
                  }
                }}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
