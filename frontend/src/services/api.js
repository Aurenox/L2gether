const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
const API_BASE = API_URL ? `${API_URL}/api` : '/api';

function getHeaders(token = null, isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  // Check stored session or passed token
  let authToken = token;
  if (!authToken) {
    try {
      const sess = JSON.parse(localStorage.getItem('l2gether_guest_session') || '{}');
      authToken = sess.token;
    } catch (e) {}
  }

  headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  headers['Pragma'] = 'no-cache';
  headers['Expires'] = '0';

  if (authToken) {
    headers['X-Session-Token'] = authToken;
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

async function handleResponse(res) {
  if (!res.ok) {
    let errData = {};
    try {
      errData = await res.json();
    } catch (e) {
      errData = { error: res.statusText || 'Network request failed' };
    }
    const error = new Error(errData.error || 'Request failed');
    error.status = res.status;
    error.code = errData.code;
    error.data = errData;
    throw error;
  }
  return res.json();
}

export const api = {
  // Guest Session & Rooms
  createGuestSession: async (displayName) => {
    const res = await fetch(`${API_BASE}/rooms/guest-session`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ displayName })
    });
    return handleResponse(res);
  },

  createRoom: async (payload) => {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  manageHostLogin: async (payload) => {
    const res = await fetch(`${API_BASE}/rooms/manage/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getRoom: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  joinRoom: async (roomId, displayName) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ displayName })
    });
    return handleResponse(res);
  },

  getParticipants: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/participants`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getPendingRequests: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/requests`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  approveRequest: async (roomId, requestId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/requests/${requestId}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  rejectRequest: async (roomId, requestId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/requests/${requestId}/reject`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  removeParticipant: async (roomId, sessionId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/participants/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  updateSettings: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  closeRoom: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/close`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Messages
  getMessages: async (roomId, params = {}) => {
    const queryParams = {};
    if (params && typeof params === 'object') {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
          queryParams[key] = value;
        }
      }
    }
    queryParams._t = Date.now();
    const q = new URLSearchParams(queryParams).toString();
    const res = await fetch(`${API_BASE}/rooms/${roomId}/messages?${q}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  sendMessage: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Shared Files
  getFiles: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/files`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  uploadFile: async (roomId, formData) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/files/upload`, {
      method: 'POST',
      headers: getHeaders(null, true),
      body: formData
    });
    return handleResponse(res);
  },

  deleteFile: async (roomId, fileId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/files/${fileId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getFileDownloadUrl: (roomId, fileId) => {
    return `${API_BASE}/rooms/${roomId}/files/${fileId}/download`;
  },

  // Workspace Multi-File Project
  getWorkspace: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  saveWorkspaceFile: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/files`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  renameWorkspaceFile: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/files/rename`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  deleteWorkspaceFile: async (roomId, path) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/files?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  batchMoveWorkspaceFiles: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/files/batch-move`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  batchCopyWorkspaceFiles: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/files/batch-copy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  batchUploadWorkspaceFiles: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/files/batch-upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  exportWorkspaceZipUrl: (roomId) => {
    return `${API_BASE}/rooms/${roomId}/workspace/export-zip`;
  },

  importWorkspaceZip: async (roomId, formData) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/workspace/import-zip`, {
      method: 'POST',
      headers: getHeaders(null, true),
      body: formData
    });
    return handleResponse(res);
  },

  // Code Execution & Terminal CLI
  executeCode: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  executeTerminalCommand: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/execute/terminal`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  runTestCases: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/execute/test-cases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getCompilersStatus: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/execute/compilers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Packages & Dependencies
  getPackageCatalog: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/packages/catalog`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getInstalledPackages: async (roomId) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/packages`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  installPackage: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/packages/install`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  uninstallPackage: async (roomId, payload) => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/packages/uninstall`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  importGoogleFonts: async (roomId, fontFamilies, targetFile = 'index.html') => {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/packages/fonts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ fontFamilies, targetFile })
    });
    return handleResponse(res);
  },

  getNetworkInfo: async () => {
    try {
      const res = await fetch(`${API_BASE}/network-info`, { headers: getHeaders() });
      return handleResponse(res);
    } catch (e) {
      return { lanIp: 'localhost', phoneBaseUrl: window.location.origin };
    }
  },

  // Generic PATCH helper
  patch: async (endpoint, data) => {
    const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  toggleRoomLock: async (roomId, options) => {
    const payload = typeof options === 'boolean' ? { locked: options } : options;
    const res = await fetch(`${API_BASE}/rooms/${roomId}/lock`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  }
};

export default api;
