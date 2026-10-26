/**
 * Utility to process files and directories dragged & dropped from Windows / OS
 */

export const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif'
]);

export const REJECTED_DOCUMENT_EXTENSIONS = new Set([
  'docx', 'doc', 'pdf', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'rtf'
]);

export const ALLOWED_WORKSPACE_EXTENSIONS = new Set([
  'txt', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'py', 'c', 'h', 'cpp', 'md', 'markdown',
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif', 'xml', 'yaml', 'yml', 'ini', 'conf',
  'env', 'gitignore', 'readme', 'sql', 'sh', 'bash', 'csv'
]);

export function isRejectedDocument(path = '') {
  const ext = path.split('.').pop().toLowerCase();
  return REJECTED_DOCUMENT_EXTENSIONS.has(ext);
}

export function isAllowedWorkspaceFile(path = '') {
  if (isRejectedDocument(path)) return false;
  const fileName = path.split('/').pop().toLowerCase();
  if (['readme', 'license', 'makefile', '.gitignore', '.env'].includes(fileName)) return true;
  const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
  if (!ext) return true; // extension-less text files allowed
  return ALLOWED_WORKSPACE_EXTENSIONS.has(ext);
}

/**
 * Checks whether a file path or extension represents an image
 */
export function isImageFile(path = '') {
  const ext = path.split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) || ext === 'svg';
}

/**
 * Reads a single File object from disk/browser
 */
export function readFileData(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = IMAGE_EXTENSIONS.has(ext);

    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file ${file.name}`));
    };

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      // SVG and all code/text files read as UTF-8 text
      reader.readAsText(file);
    }
  });
}

/**
 * Recursively traverses a FileSystemEntry (from webkitGetAsEntry)
 */
async function traverseFileSystemEntry(entry, currentPath = '') {
  const results = [];

  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });
    if (isRejectedDocument(file.name)) {
      results.push({ isRejectedDoc: true, name: file.name });
      return results;
    }
    const relativePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    const content = await readFileData(file);
    results.push({
      path: relativePath,
      content,
      isDirectory: false
    });
  } else if (entry.isDirectory) {
    const dirPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    results.push({
      path: dirPath,
      content: '',
      isDirectory: true
    });

    const dirReader = entry.createReader();
    const readAllEntries = async () => {
      let allEntries = [];
      while (true) {
        const batch = await new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        if (!batch.length) break;
        allEntries = allEntries.concat(batch);
      }
      return allEntries;
    };

    const entries = await readAllEntries();
    for (const childEntry of entries) {
      const childResults = await traverseFileSystemEntry(childEntry, dirPath);
      results.push(...childResults);
    }
  }

  return results;
}

/**
 * Extracts and reads all dropped files and folders from a drag event
 * @param {DragEvent} e - Native drag event
 * @param {string} targetFolder - Optional target subfolder inside workspace
 * @returns {Promise<Array<{ path: string, content: string, isDirectory: boolean }>>}
 */
export async function processDroppedItems(e, targetFolder = '') {
  const items = e.dataTransfer?.items;
  const rawFiles = e.dataTransfer?.files;
  const rawProcessed = [];
  let rejectedCount = 0;

  // 1. Try webkitGetAsEntry for deep folder traversal
  if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        promises.push(traverseFileSystemEntry(entry, ''));
      }
    }
    const nestedArrays = await Promise.all(promises);
    for (const arr of nestedArrays) {
      rawProcessed.push(...arr);
    }
  } else if (rawFiles && rawFiles.length > 0) {
    // 2. Fallback to standard FileList
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      if (isRejectedDocument(file.name)) {
        rejectedCount++;
        continue;
      }
      const content = await readFileData(file);
      // Try to preserve webkitRelativePath if available, else use file.name
      const relPath = file.webkitRelativePath || file.name;
      rawProcessed.push({
        path: relPath,
        content,
        isDirectory: false
      });
    }
  }

  const validItems = [];
  for (const item of rawProcessed) {
    if (item.isRejectedDoc) {
      rejectedCount++;
    } else {
      validItems.push(item);
    }
  }

  if (rejectedCount > 0) {
    alert(`Document files (.docx, .pdf, .ppt) are not supported in the code editor workspace. ${rejectedCount} document file(s) were excluded. Please upload documents in the Shared Files tab instead.`);
  }

  // Prepend targetFolder if specified
  const cleanTarget = targetFolder ? targetFolder.replace(/^\.?\/+/, '').replace(/\/+$/, '') : '';

  return validItems.map((item) => {
    const cleanItemPath = item.path.replace(/^\.?\/+/, '');
    const finalPath = cleanTarget ? `${cleanTarget}/${cleanItemPath}` : cleanItemPath;
    return {
      ...item,
      path: finalPath
    };
  });
}
