import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code2,
  Globe,
  MessageSquare,
  HardDrive,
  Package,
  Home,
  Users,
  Play,
  Square,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  Terminal,
  Settings,
  FolderTree,
  Lock,
  Unlock,
  Shield,
  Radio,
  Maximize2,
  Minimize2,
  Sliders,
  PenTool,
  User,
  HelpCircle,
  X,
  Mail
} from 'lucide-react';
import WhiteboardModal from '../components/whiteboard/WhiteboardModal';
import RoomHeader from '../components/navigation/RoomHeader';
import RoomOverview from '../components/room/RoomOverview';
import ShareQRModal from '../components/room/ShareQRModal';
import ParticipantListModal from '../components/room/ParticipantListModal';
import RoomSettingsModal from '../components/room/RoomSettingsModal';
import TemplatePickerModal from '../components/templates/TemplatePickerModal';
import AudioEchoHelpModal from '../components/audio/AudioEchoHelpModal';
import FirstTimeUserGuideModal from '../components/common/FirstTimeUserGuideModal';
import FileExplorer from '../components/editor/FileExplorer';
import TabBar from '../components/editor/TabBar';
import MonacoEditorWrapper from '../components/editor/MonacoEditorWrapper';
import ImagePreviewPanel from '../components/editor/ImagePreviewPanel';
import LivePreview from '../components/preview/LivePreview';
import ChatPanel from '../components/chat/ChatPanel';
import FilesPanel from '../components/files/FilesPanel';
import PackageManagerPanel from '../components/packages/PackageManagerPanel';
import AudioPermissionModal from '../components/audio/AudioPermissionModal';
import MobileAudioCallBar from '../components/audio/MobileAudioCallBar';
import { useAuth } from '../contexts/AuthContext';
import { useAudioCall } from '../contexts/AudioContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import { detectLanguageFromPath } from '../utils/templates';
import { isImageFile, processDroppedItems } from '../utils/fileDropHelper';

export default function RoomWorkspacePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { session, isAuthenticated } = useAuth();
  const { leaveAudioCall } = useAudioCall();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Lock & Live Collaborators Sync
  const [isEditingLocked, setIsEditingLocked] = useState(false);
  const [lockedFiles, setLockedFiles] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [autoFollowHost, setAutoFollowHost] = useState(false);
  const [lockNotification, setLockNotification] = useState(null);

  // Active navigation sidebar tab: overview, code, preview, chat, files, packages
  const [activeTab, setActiveTab] = useState('code');
  const activeTabRef = useRef(activeTab);

  // Participants & Socket Instance & Chat Notifications
  const [socketInstance, setSocketInstance] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [hasChatMention, setHasChatMention] = useState(false);
  const [chatMentionToast, setChatMentionToast] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'chat') {
      setUnreadChatCount(0);
      setHasChatMention(false);
      setChatMentionToast(null);
    }
  }, [activeTab]);

  // Set to prevent duplicate unread increments or duplicate mention toasts
  const seenChatMsgIdsRef = useRef(new Set());
  const chatToastTimeoutRef = useRef(null);

  // Dedicated chat socket listener for real-time unread counts and mentions
  useEffect(() => {
    const socket = socketInstance || socketRef.current;
    if (!socket) return;

    const handleChatMessage = (msg) => {
      if (!msg || !msg.id) return;

      // Deduplicate by message ID - guarantees 1 incoming message NEVER increments count by 2
      if (seenChatMsgIdsRef.current.has(msg.id)) return;
      seenChatMsgIdsRef.current.add(msg.id);

      const currentSession = sessionRef.current || session;
      const mySessionId = currentSession?.sessionId || currentSession?.id;
      const myName = (currentSession?.displayName || '').trim().toLowerCase();

      // Check if message was sent by the current user
      const isSender =
        (mySessionId && msg.sender_session_id === mySessionId) ||
        (myName && msg.sender_name && msg.sender_name.trim().toLowerCase() === myName);

      // Sender NEVER triggers unread badge or self-mention notifications
      if (isSender) return;

      const contentLower = (msg.content || '').toLowerCase();
      const isAllMention =
        contentLower.includes('@all') ||
        contentLower.includes('@everyone') ||
        contentLower.includes('@every one') ||
        contentLower.includes('@everybody');

      const myCleanName = myName.replace(/\s+/g, '');
      const isDirectMention = Boolean(
        myName && (
          contentLower.includes(`@${myName}`) ||
          (myCleanName && contentLower.includes(`@${myCleanName}`))
        )
      );

      const isMentioned = isAllMention || isDirectMention;

      // Only increment unread count if user is currently on another workspace tab
      if (activeTabRef.current !== 'chat') {
        setUnreadChatCount((prev) => prev + 1);

        if (isMentioned) {
          setHasChatMention(true);
          setChatMentionToast({
            id: msg.id,
            sender: msg.sender_name || 'Teammate',
            content: msg.content,
            isAll: isAllMention
          });

          if (chatToastTimeoutRef.current) clearTimeout(chatToastTimeoutRef.current);
          chatToastTimeoutRef.current = setTimeout(() => {
            setChatMentionToast(null);
          }, 7000);
        }
      }
    };

    socket.off('new_message', handleChatMessage);
    socket.on('new_message', handleChatMessage);

    return () => {
      socket.off('new_message', handleChatMessage);
      if (chatToastTimeoutRef.current) clearTimeout(chatToastTimeoutRef.current);
    };
  }, [socketInstance]);

  // Workspace & Files
  const [files, setFiles] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState('');
  const [activeFileContent, setActiveFileContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showExplorer, setShowExplorer] = useState(window.innerWidth > 768);
  const [isDraggingOverEditor, setIsDraggingOverEditor] = useState(false);
  const [viewSvgAsSource, setViewSvgAsSource] = useState(false);

  // Bottom Dock: terminal or problems
  const [dockTab, setDockTab] = useState('terminal'); // terminal, problems
  const [showBottomDock, setShowBottomDock] = useState(true);

  // Bottom Dock height and resize state
  const [dockHeight, setDockHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('l2gether_terminal_height');
      return saved ? Math.max(140, Math.min(800, parseInt(saved, 10))) : 260;
    } catch (e) {
      return 260;
    }
  });
  const [isDockMaximized, setIsDockMaximized] = useState(false);
  const isResizingDockRef = useRef(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(260);

  const handleResizerPointerDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    isResizingDockRef.current = true;
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current = dockHeight;
    document.body.style.userSelect = 'none';
  };

  const handleResizerPointerMove = (e) => {
    if (!isResizingDockRef.current) return;
    const deltaY = resizeStartYRef.current - e.clientY;
    const maxH = Math.floor(window.innerHeight * 0.85);
    const newH = Math.max(120, Math.min(maxH, resizeStartHeightRef.current + deltaY));
    setDockHeight(newH);
    if (isDockMaximized) setIsDockMaximized(false);
  };

  const handleResizerPointerUp = (e) => {
    if (!isResizingDockRef.current) return;
    isResizingDockRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    document.body.style.userSelect = '';
    try {
      localStorage.setItem('l2gether_terminal_height', String(dockHeight));
    } catch (err) {}
  };

  const handleToggleMaximizeDock = () => {
    if (isDockMaximized) {
      setDockHeight(260);
      setIsDockMaximized(false);
    } else {
      setDockHeight(Math.floor(window.innerHeight * 0.75));
      setIsDockMaximized(true);
    }
  };

  // Execution runner
  const [executionOutput, setExecutionOutput] = useState(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [problems, setProblems] = useState([]);
  const [stdinData, setStdinData] = useState('');
  const [testCases, setTestCases] = useState([]);

  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAudioHelpModal, setShowAudioHelpModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [isCreatorSticky, setIsCreatorSticky] = useState(false);
  const creatorTimerRef = useRef(null);

  const handleCreatorMouseEnter = () => {
    if (creatorTimerRef.current) {
      clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    setShowCreatorPopup(true);
  };

  const handleCreatorMouseLeave = () => {
    if (isCreatorSticky) return; // Keep window open if user clicked it open!
    if (creatorTimerRef.current) clearTimeout(creatorTimerRef.current);
    // Generous 800ms grace period so users can move their mouse comfortably without rushing
    creatorTimerRef.current = setTimeout(() => {
      setShowCreatorPopup(false);
    }, 800);
  };

  const handleCreatorClick = (e) => {
    e.stopPropagation();
    if (creatorTimerRef.current) {
      clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    if (showCreatorPopup && isCreatorSticky) {
      setIsCreatorSticky(false);
      setShowCreatorPopup(false);
    } else {
      setIsCreatorSticky(true);
      setShowCreatorPopup(true);
    }
  };

  const handleCloseCreatorPopup = (e) => {
    if (e) e.stopPropagation();
    if (creatorTimerRef.current) clearTimeout(creatorTimerRef.current);
    setIsCreatorSticky(false);
    setShowCreatorPopup(false);
  };

  // Touch gesture state for File Explorer swipe-left to collapse
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const timeElapsed = Date.now() - touchStartRef.current.time;

      // Swipe Left to close file explorer (horizontal displacement > 45px and dominant over vertical)
      if (deltaX < -45 && Math.abs(deltaY) < 100 && timeElapsed < 800) {
        setShowExplorer(false);
      }
    }
  };

  const handleContainerTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      // Edge swipe right (< 35px from left edge) opens file explorer
      if (touchStartRef.current.x < 35 && deltaX > 50 && Math.abs(deltaY) < 100) {
        setShowExplorer(true);
      }
    }
  };

  // Derived lock state: is the active file currently locked for this user?
  const isCurrentFileLocked =
    !room?.isOwner &&
    (isEditingLocked ||
      (lockedFiles || []).includes('*') ||
      (activeFilePath && (lockedFiles || []).includes(activeFilePath)));

  const socketRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const roomRef = useRef(null);
  const autoFollowRef = useRef(false);
  const filesRef = useRef([]);
  const openTabsRef = useRef([]);
  const sessionRef = useRef(session);
  const switchActiveFileRef = useRef();
  const followToastTimerRef = useRef(null);
  const [followToast, setFollowToast] = useState(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    autoFollowRef.current = autoFollowHost;
  }, [autoFollowHost]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Reliable Tab & File Switching with Workspace Sync fallback & follow awareness
  const switchActiveFile = async (path, emitSocket = true, reason = 'user', senderName = 'Host') => {
    if (!path) return;

    let targetFile = filesRef.current.find(f => f.path === path);
    if (!targetFile) {
      try {
        const wsData = await api.getWorkspace(roomId);
        if (wsData?.files) {
          filesRef.current = wsData.files;
          setFiles(wsData.files);
          targetFile = wsData.files.find(f => f.path === path);
        }
      } catch (err) {
        console.warn('[LiveFollow] Failed to load workspace files for path:', path, err);
      }
    }

    if (!targetFile || targetFile.is_directory) return;

    setOpenTabs(prev => (prev.includes(path) ? prev : [...prev, path]));
    setActiveFilePath(path);
    setActiveFileContent(targetFile.content);
    setIsDirty(false);
    setViewSvgAsSource(false);

    if (reason === 'follow') {
      setActiveTab('code');
      setFollowToast(`📡 Following Host (${senderName || 'Editor'}) → ${path}`);
      if (followToastTimerRef.current) clearTimeout(followToastTimerRef.current);
      followToastTimerRef.current = setTimeout(() => setFollowToast(null), 3500);
    }

    if (emitSocket && socketRef.current && roomId) {
      socketRef.current.emit('active_file_change', {
        roomId,
        path,
        isHost: Boolean(roomRef.current?.isOwner)
      });
    }
  };

  const handleSelectFile = (path, emitSocket = true) => {
    switchActiveFile(path, emitSocket, 'user');
  };

  useEffect(() => {
    switchActiveFileRef.current = switchActiveFile;
  });

  // 1. Initial Room Authorization and Workspace Load
  useEffect(() => {
    async function loadRoomAndWorkspace() {
      try {
        setLoading(true);
        setError(null);

        // Fetch room info
        const roomData = await api.getRoom(roomId);
        if (roomData.isExpired) {
          navigate(`/room/${roomId}/expired`);
          return;
        }

        if (roomData.status === 'closed') {
          alert('This room has been closed by the host.');
          navigate('/');
          return;
        }

        if (!roomData.isMember) {
          // Redirect to join page if not a member yet
          navigate(`/join/${roomId}`);
          return;
        }

        setRoom(roomData);
        setIsEditingLocked(Boolean(roomData.isEditingLocked));
        setLockedFiles(roomData.lockedFiles || []);
        if (roomData.participants) {
          setParticipants(roomData.participants);
        }
        try {
          const pRes = await api.getParticipants(roomId);
          if (pRes?.participants) {
            setParticipants(pRes.participants);
          }
        } catch (e) {}

        if (!roomData.isOwner) {
          setAutoFollowHost(true);
        }

        // Fetch workspace and files
        const wsData = await api.getWorkspace(roomId);
        const wsFiles = wsData.files || [];
        filesRef.current = wsFiles;
        setFiles(wsFiles);

        // Open first file by default (e.g. index.html or main.py)
        let initialPath = null;
        if (wsFiles.length > 0) {
          const firstFile = wsFiles.find(f => !f.is_directory) || wsFiles[0];
          initialPath = firstFile.path;
          setActiveFilePath(firstFile.path);
          setActiveFileContent(firstFile.content);
          setOpenTabs([firstFile.path]);
        }

        // Initialize Socket.IO connection
        const socket = getSocket(session?.token);
        socketRef.current = socket;
        setSocketInstance(socket);

        const handleJoinRoom = () => {
          socket.emit('join_room', { roomId });
          if (initialPath) {
            socket.emit('active_file_change', {
              roomId,
              path: initialPath,
              isHost: Boolean(roomData.isOwner)
            });
          }
        };

        if (socket.connected) {
          handleJoinRoom();
        } else {
          socket.connect();
          socket.once('connect', handleJoinRoom);
        }

        // On reconnect (e.g. Edge tab restored or network wake)
        socket.on('reconnect', handleJoinRoom);

        // Listen for 7-day room expiration broadcast
        socket.on('room_expired', () => {
          leaveAudioCall(roomId);
          navigate(`/room/${roomId}/expired`);
        });

        // Listen for room closure by host
        socket.on('room_closed', ({ message }) => {
          leaveAudioCall(roomId);
          alert(message || 'This room has been closed by the host.');
          navigate('/');
        });

        // Listen for participant removed by host
        socket.on('participant_removed', ({ sessionId, message }) => {
          if (sessionId === sessionRef.current?.sessionId) {
            leaveAudioCall(roomId);
            alert(message || 'You have been removed from this workspace by the host.');
            navigate(`/join/${roomId}`);
          } else {
            setParticipants(prev => prev.filter(p => p.session_id !== sessionId));
          }
        });

        // Remote file tree sync
        socket.on('remote_file_created', ({ file }) => {
          setFiles(prev => {
            const updated = [...prev.filter(f => f.path !== file.path), file];
            filesRef.current = updated;
            return updated;
          });
        });
        socket.on('remote_file_deleted', ({ path }) => {
          setFiles(prev => {
            const updated = prev.filter(f => f.path !== path && !f.path.startsWith(`${path}/`));
            filesRef.current = updated;
            return updated;
          });
          setOpenTabs(prev => prev.filter(p => p !== path));
        });
        socket.on('remote_file_renamed', ({ oldPath, newPath }) => {
          setFiles(prev => {
            const updated = prev.map(f => {
              if (f.path === oldPath) return { ...f, path: newPath };
              if (f.path.startsWith(`${oldPath}/`)) {
                return { ...f, path: f.path.replace(`${oldPath}/`, `${newPath}/`) };
              }
              return f;
            });
            filesRef.current = updated;
            return updated;
          });
          setOpenTabs(prev => prev.map(p => {
            if (p === oldPath) return newPath;
            if (p.startsWith(`${oldPath}/`)) {
              return p.replace(`${oldPath}/`, `${newPath}/`);
            }
            return p;
          }));
        });

        socket.on('remote_workspace_files_updated', ({ files: updatedFiles }) => {
          if (Array.isArray(updatedFiles)) {
            setFiles(updatedFiles);
            filesRef.current = updatedFiles;
          }
        });

        // Edit lock sync (per file or all files)
        socket.on('edit_lock_changed', ({ isLocked, lockedFiles: updatedLockedFiles, lockedBy, path, all }) => {
          setIsEditingLocked(Boolean(isLocked));
          if (updatedLockedFiles) {
            setLockedFiles(updatedLockedFiles);
          }
          const isFileSpecific = path && !all;
          const msg = isFileSpecific
            ? `🔒 File "${path}" was ${updatedLockedFiles?.includes(path) ? 'locked' : 'unlocked'} by ${lockedBy || 'host'}.`
            : (isLocked
                ? `🔒 Code editing is now locked by ${lockedBy || 'the room host'}. Read-only mode active.`
                : `🔓 Code editing is now unlocked by ${lockedBy || 'the room host'}. You can edit files.`);
          setLockNotification(msg);
          setTimeout(() => setLockNotification(null), 5000);
        });

        socket.on('edit_lock_rejected', (data) => {
          alert(data.message || 'Editing is locked by the room host.');
        });

        // Collaborators presence & active files
        socket.on('existing_collaborator_files', ({ collaborators: existing }) => {
          setCollaborators(existing || []);
          // If we are a viewer with autoFollow on, jump to host's current active file
          if (autoFollowRef.current && !roomRef.current?.isOwner && existing && existing.length > 0) {
            const hostCollab = existing.find(c => c.isHost || (roomRef.current && c.sessionId === roomRef.current.ownerSessionId));
            if (hostCollab && hostCollab.path) {
              if (switchActiveFileRef.current) {
                switchActiveFileRef.current(hostCollab.path, false, 'follow', hostCollab.displayName);
              }
            }
          }
        });

        socket.on('user_active_file_changed', ({ sessionId, displayName, path, isHost }) => {
          setCollaborators(prev => {
            const filtered = prev.filter(c => c.sessionId !== sessionId);
            if (path) {
              return [...filtered, { sessionId, displayName, path, isHost: Boolean(isHost) }];
            }
            return filtered;
          });

          // Check if auto-follow should trigger
          const isMyOwnEvent = sessionId === sessionRef.current?.sessionId;
          const amIOwner = Boolean(roomRef.current?.isOwner);
          const isHostSender = Boolean(isHost) || (roomRef.current && sessionId === roomRef.current.ownerSessionId);

          if (!isMyOwnEvent && !amIOwner && autoFollowRef.current && isHostSender && path) {
            if (switchActiveFileRef.current) {
              switchActiveFileRef.current(path, false, 'follow', displayName);
            }
          }
        });

        socket.on('user_active_file_cleared', ({ sessionId }) => {
          setCollaborators(prev => prev.filter(c => c.sessionId !== sessionId));
        });

        // Real-time authoritative participant roster and joiner count sync
        socket.on('room_participants_updated', ({ participantCount, participants: updatedList }) => {
          if (Array.isArray(updatedList) && updatedList.length > 0) {
            setParticipants(updatedList);
          }
          setRoom(prev => {
            if (!prev) return prev;
            const newCount = participantCount || (Array.isArray(updatedList) ? updatedList.length : prev.participantCount);
            return { ...prev, participantCount: newCount };
          });
        });

        // Update participant roster when a user connects or disconnects in real time
        socket.on('user_joined', ({ sessionId, displayName, participantCount, participants: updatedList }) => {
          if (Array.isArray(updatedList) && updatedList.length > 0) {
            setParticipants(updatedList);
          } else {
            setParticipants(prev => {
              if (prev.some(p => p.session_id === sessionId)) return prev;
              return [...prev, { session_id: sessionId, display_name: displayName, role: 'member' }];
            });
          }
          setRoom(prev => {
            if (!prev) return prev;
            const newCount = participantCount || (prev.participantCount ? prev.participantCount + 1 : 2);
            return { ...prev, participantCount: newCount };
          });
        });

        socket.on('user_left', ({ sessionId, participantCount, participants: updatedList }) => {
          if (Array.isArray(updatedList)) {
            setParticipants(updatedList);
          } else {
            setParticipants(prev => prev.filter(p => p.session_id !== sessionId));
          }
          setRoom(prev => {
            if (!prev) return prev;
            const newCount = participantCount || Math.max(1, (prev.participantCount || 2) - 1);
            return { ...prev, participantCount: newCount };
          });
        });

      } catch (err) {
        if (err.status === 410 || err.code === 'ROOM_EXPIRED') {
          navigate(`/room/${roomId}/expired`);
        } else if (err.code === 'ROOM_CLOSED' || (err.status === 403 && (err.message?.includes('closed') || err.message?.includes('Closed')))) {
          alert('This room has been closed by the host.');
          navigate('/');
        } else if (err.code === 'NOT_A_MEMBER') {
          alert('You are not an active participant in this room.');
          navigate(`/join/${roomId}`);
        } else {
          setError(err.message || 'Failed to load workspace.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (roomId) loadRoomAndWorkspace();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('room_expired');
        socketRef.current.off('room_closed');
        socketRef.current.off('participant_removed');
        socketRef.current.off('remote_file_created');
        socketRef.current.off('remote_file_deleted');
        socketRef.current.off('remote_file_renamed');
        socketRef.current.off('edit_lock_changed');
        socketRef.current.off('edit_lock_rejected');
        socketRef.current.off('existing_collaborator_files');
        socketRef.current.off('user_active_file_cleared');
        socketRef.current.off('room_participants_updated');
        socketRef.current.off('user_joined');
        socketRef.current.off('user_left');
      }
    };
  }, [roomId, navigate, session?.token]);

  // Toggle lock for a specific file (owner only)
  const handleToggleFileLock = async (targetPath = activeFilePath, lockState) => {
    if (!room?.isOwner || !targetPath) return;
    const isLocked = lockedFiles.includes(targetPath);
    const nextLocked = lockState !== undefined ? lockState : !isLocked;

    try {
      const res = await api.toggleRoomLock(roomId, {
        locked: nextLocked,
        path: targetPath,
        all: false
      });
      if (res?.lockedFiles !== undefined) {
        setLockedFiles(res.lockedFiles);
        setIsEditingLocked(Boolean(res.isLocked));
      }
      socketRef.current?.emit('toggle_edit_lock', {
        roomId,
        isLocked: nextLocked,
        path: targetPath,
        all: false
      });
    } catch (err) {
      console.error('Failed to toggle file lock:', err);
    }
  };

  // Toggle lock for entire workspace (owner only)
  const handleToggleWorkspaceLock = async () => {
    if (!room?.isOwner) return;
    const isCurrentlyAllLocked = Boolean(isEditingLocked || (lockedFiles || []).includes('*'));
    const nextLocked = !isCurrentlyAllLocked;
    try {
      setIsEditingLocked(nextLocked);
      if (!nextLocked) {
        setLockedFiles([]);
      } else {
        setLockedFiles(['*']);
      }
      const res = await api.toggleRoomLock(roomId, { locked: nextLocked, all: true });
      if (res?.lockedFiles !== undefined) {
        setLockedFiles(res.lockedFiles);
        setIsEditingLocked(Boolean(res.isLocked));
      }
      socketRef.current?.emit('toggle_edit_lock', { roomId, isLocked: nextLocked, all: true });
    } catch (err) {
      console.error('Failed to toggle workspace lock:', err);
    }
  };

  const handleToggleEditLock = handleToggleWorkspaceLock;

  // Execute terminal shell command (gcc, python, ls, cat, etc.)
  const handleExecuteTerminalCommand = async (commandString, customStdin) => {
    if (!commandString || !roomId) return;
    setIsRunningCode(true);
    try {
      const result = await api.executeTerminalCommand(roomId, {
        command: commandString,
        stdin: typeof customStdin === 'string' ? customStdin : stdinData
      });
      return result;
    } catch (err) {
      const errRes = {
        command: commandString,
        stdout: '',
        stderr: 'Terminal execution failed: ' + err.message,
        exitCode: 1,
        durationMs: 0
      };
      return errRes;
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleCloseTab = (path) => {
    const updated = openTabs.filter(p => p !== path);
    setOpenTabs(updated);

    if (activeFilePath === path) {
      if (updated.length > 0) {
        const nextPath = updated[updated.length - 1];
        handleSelectFile(nextPath);
      } else {
        setActiveFilePath('');
        setActiveFileContent('');
        if (socketRef.current && roomId) {
          socketRef.current.emit('active_file_change', { roomId, path: null });
        }
      }
    }
  };

  // Content change & autosave trigger
  const handleContentChange = (newVal) => {
    setActiveFileContent(newVal);
    setIsDirty(true);

    // Update in local files array
    setFiles(prev =>
      prev.map(f => (f.path === activeFilePath ? { ...f, content: newVal } : f))
    );

    // Autosave after 1.5 seconds of inactivity
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      handleSaveFile(activeFilePath, newVal);
    }, 1500);
  };

  // Save File to Backend
  const handleSaveFile = async (path = activeFilePath, contentToSave = activeFileContent) => {
    if (!path) return;
    try {
      setIsSaving(true);
      await api.saveWorkspaceFile(roomId, {
        path,
        content: contentToSave
      });
      setIsDirty(false);
    } catch (e) {
      console.error('Failed to save file:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // File Creation
  const handleCreateFile = async (filename) => {
    try {
      const res = await api.saveWorkspaceFile(roomId, {
        path: filename,
        content: ''
      });
      setFiles(prev => [...prev.filter(f => f.path !== filename), res.file]);
      handleSelectFile(filename);

      if (socketRef.current) {
        socketRef.current.emit('file_created', { roomId, file: res.file });
      }
    } catch (e) {
      alert('Failed to create file: ' + e.message);
    }
  };

  // Folder Creation
  const handleCreateFolder = async (folderName) => {
    try {
      const res = await api.saveWorkspaceFile(roomId, {
        path: folderName,
        isDirectory: true
      });
      setFiles(prev => [...prev.filter(f => f.path !== folderName), res.file]);

      if (socketRef.current) {
        socketRef.current.emit('file_created', { roomId, file: res.file });
      }
    } catch (e) {
      alert('Failed to create folder: ' + e.message);
    }
  };

  // Rename File/Folder
  const handleRename = async (oldPath, newPath) => {
    try {
      await api.renameWorkspaceFile(roomId, { oldPath, newPath });
      setFiles(prev => prev.map(f => f.path === oldPath ? { ...f, path: newPath } : f));
      setOpenTabs(prev => prev.map(p => p === oldPath ? newPath : p));
      if (activeFilePath === oldPath) setActiveFilePath(newPath);

      if (socketRef.current) {
        socketRef.current.emit('file_renamed', { roomId, oldPath, newPath });
      }
    } catch (e) {
      alert('Failed to rename: ' + e.message);
    }
  };

  // Delete File/Folder
  const handleDeleteFile = async (path) => {
    try {
      await api.deleteWorkspaceFile(roomId, path);
      setFiles(prev => prev.filter(f => f.path !== path && !f.path.startsWith(`${path}/`)));
      handleCloseTab(path);

      if (socketRef.current) {
        socketRef.current.emit('file_deleted', { roomId, path });
      }
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  };

  // Batch Move (Cut & Paste into Folder)
  const handleBatchMove = async (paths, targetFolder = '') => {
    try {
      const res = await api.batchMoveWorkspaceFiles(roomId, { paths, targetFolder });
      if (res?.files) {
        setFiles(res.files);
        filesRef.current = res.files;
      }
      if (res?.moves) {
        setOpenTabs(prev => prev.map(p => {
          const match = res.moves.find(m => m.oldPath === p || p.startsWith(`${m.oldPath}/`));
          if (!match) return p;
          if (match.oldPath === p) return match.newPath;
          return p.replace(`${match.oldPath}/`, `${match.newPath}/`);
        }));
        const activeMatch = res.moves.find(m => m.oldPath === activeFilePath || activeFilePath.startsWith(`${m.oldPath}/`));
        if (activeMatch) {
          if (activeMatch.oldPath === activeFilePath) setActiveFilePath(activeMatch.newPath);
          else setActiveFilePath(activeFilePath.replace(`${activeMatch.oldPath}/`, `${activeMatch.newPath}/`));
        }
      }
      if (socketRef.current) {
        socketRef.current.emit('workspace_files_updated', { roomId, files: res.files });
      }
      return res;
    } catch (e) {
      alert('Failed to move files: ' + e.message);
      throw e;
    }
  };

  // Batch Copy (Copy & Paste into Folder)
  const handleBatchCopy = async (paths, targetFolder = '') => {
    try {
      const res = await api.batchCopyWorkspaceFiles(roomId, { paths, targetFolder });
      if (res?.files) {
        setFiles(res.files);
        filesRef.current = res.files;
      }
      if (socketRef.current) {
        socketRef.current.emit('workspace_files_updated', { roomId, files: res.files });
      }
      return res;
    } catch (e) {
      alert('Failed to copy files: ' + e.message);
      throw e;
    }
  };

  // Batch Upload from Drag and Drop (Files, Images, or Folders)
  const handleDropFiles = async (droppedItems, targetFolder = '') => {
    if (!droppedItems || droppedItems.length === 0) return;
    if (isEditingLocked && !room?.isOwner) {
      alert('Workspace editing is locked by the host.');
      return;
    }

    try {
      const res = await api.batchUploadWorkspaceFiles(roomId, { files: droppedItems });
      if (res?.files) {
        setFiles(res.files);
        filesRef.current = res.files;
      }
      if (socketRef.current) {
        socketRef.current.emit('workspace_files_updated', { roomId, files: res.files });
      }

      // Automatically select and open the first dropped file
      const firstFile = droppedItems.find((item) => !item.isDirectory);
      if (firstFile) {
        handleSelectFile(firstFile.path);
      }
      return res;
    } catch (e) {
      console.error('Failed to upload dropped files:', e);
      alert('Failed to upload files: ' + e.message);
      throw e;
    }
  };

  // Export & Import ZIP
  const handleExportZip = () => {
    window.location.href = api.exportWorkspaceZipUrl(roomId);
  };

  // Automatically reload workspace files from server (e.g. after Smart Package Manager injection or batch file uploads)
  const handleReloadWorkspaceFiles = async (targetFilePath = null) => {
    try {
      const wsData = await api.getWorkspace(roomId);
      if (wsData?.files) {
        setFiles(wsData.files);
        filesRef.current = wsData.files;

        // If the open active file was the one modified (or matches targetFilePath), refresh its content in Monaco Editor
        const currentActive = activeFilePath;
        if (currentActive) {
          const matchingUpdatedFile = wsData.files.find((f) => f.path === currentActive);
          if (matchingUpdatedFile) {
            setActiveFileContent(matchingUpdatedFile.content);
            setIsDirty(false);
          }
        }

        // Notify other room participants via socket so everyone gets real-time update
        if (socketRef.current) {
          socketRef.current.emit('workspace_files_updated', {
            roomId,
            files: wsData.files
          });
        }
      }
    } catch (e) {
      console.error('Failed to auto-refresh workspace files:', e);
    }
  };

  const handleImportZip = async (zipFile) => {
    try {
      const formData = new FormData();
      formData.append('zipFile', zipFile);
      const res = await api.importWorkspaceZip(roomId, formData);
      alert(`Imported ${res.importedCount} files from ZIP archive.`);
      // Refresh files
      await handleReloadWorkspaceFiles();
    } catch (e) {
      alert('Failed to import ZIP: ' + e.message);
    }
  };

  // Code Execution Runner with dynamic stdin input and workspace files sync
  const handleRunCode = async (customStdin) => {
    if (!activeFilePath || !activeFileContent) return;

    try {
      setIsRunningCode(true);
      setShowBottomDock(true);
      setDockTab('terminal');

      const effectiveStdin = typeof customStdin === 'string' ? customStdin : (stdinData || '');
      if (typeof customStdin === 'string') {
        setStdinData(customStdin);
      }

      const language = detectLanguageFromPath(activeFilePath);
      const res = await api.executeCode(roomId, {
        language,
        code: activeFileContent,
        stdin: effectiveStdin,
        files: filesRef.current.map(f => ({ path: f.path, content: f.content }))
      });

      setExecutionOutput(res);
      setProblems(res.problems || []);

      // Keep bottom dock open on terminal tab so compiler output is immediately visible!
      setDockTab('terminal');
    } catch (e) {
      setExecutionOutput({
        stdout: '',
        stderr: 'Execution failed: ' + e.message,
        exitCode: 1,
        durationMs: 0
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Automated Test Cases Runner
  const handleRunTestCases = async () => {
    if (!activeFilePath || !activeFileContent) return null;
    const language = detectLanguageFromPath(activeFilePath);
    return await api.runTestCases(roomId, {
      language,
      code: activeFileContent,
      testCases,
      files: filesRef.current.map(f => ({ path: f.path, content: f.content }))
    });
  };

  // Jump cursor to problem location
  const handleNavigateToProblem = (file, line, col) => {
    if (file && file !== activeFilePath) {
      handleSelectFile(file);
    }
    // Monaco editor command to reveal line can be fired
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="live-pulse" style={{ width: '16px', height: '16px', marginBottom: '1rem' }} />
          <div>Connecting to workspace...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <AlertCircle size={32} color="var(--state-error)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Unable to Access Room</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/join')}>
            Go to Join Room
          </button>
        </div>
      </div>
    );
  }

  const currentParticipantCount = Math.max(participants.length, room?.participantCount || 1);

  return (
    <div className="room-container">
      {/* Top Application Bar */}
      <RoomHeader
        room={room}
        participantCount={currentParticipantCount}
        isEditingLocked={Boolean(isEditingLocked || (lockedFiles || []).includes('*'))}
        onToggleEditLock={handleToggleEditLock}
        onOpenQR={() => setShowQRModal(true)}
        onOpenParticipants={() => setShowParticipantsModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        autoFollowHost={autoFollowHost}
        onToggleAutoFollow={() => setAutoFollowHost(v => !v)}
        onOpenAudioHelp={() => setShowAudioHelpModal(true)}
        onOpenGuide={() => setShowGuideModal(true)}
      />

      {/* Temporary Floating Lock Notification */}
      {lockNotification && (
        <div className="lock-toast-notification">
          <span>{lockNotification}</span>
        </div>
      )}

      {/* Floating Live Follow Toast */}
      {followToast && (
        <div className="live-follow-toast">
          <Radio size={13} className="live-pulse-icon" />
          <span>{followToast}</span>
        </div>
      )}

      {/* Floating Chat Mention Notification Toast */}
      {chatMentionToast && (
        <div
          className="chat-mention-toast"
          onClick={() => {
            setActiveTab('chat');
            setUnreadChatCount(0);
            setHasChatMention(false);
            setChatMentionToast(null);
          }}
          title="Click to view message in Chat"
        >
          <div className="mention-toast-icon">@</div>
          <div className="mention-toast-content">
            <div className="mention-toast-header">
              <strong>{chatMentionToast.sender}</strong>{' '}
              {chatMentionToast.isAll ? 'mentioned @everyone in chat' : 'mentioned you in chat'}
            </div>
            <div className="mention-toast-text">{chatMentionToast.content}</div>
          </div>
          <button
            className="mention-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              setChatMentionToast(null);
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="room-main-area">
        {/* Activity Sidebar Navigation */}
        <aside className="activity-bar">
          <button
            className={`activity-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            title="Room Overview"
          >
            <Home size={18} />
          </button>
          <button
            className={`activity-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
            title="Code Workspace"
          >
            <Code2 size={18} />
          </button>
          <button
            className={`activity-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            title="Live Web Preview"
          >
            <Globe size={18} />
          </button>
          <button
            className={`activity-tab-btn ${activeTab === 'chat' ? 'active' : ''} ${hasChatMention ? 'has-mention' : ''}`}
            onClick={() => {
              setActiveTab('chat');
              setUnreadChatCount(0);
              setHasChatMention(false);
              setChatMentionToast(null);
            }}
            title={hasChatMention ? 'You were mentioned in Chat!' : unreadChatCount > 0 ? `${unreadChatCount} new chat message(s)` : 'Real-Time Chat'}
            style={{ position: 'relative' }}
          >
            <MessageSquare size={18} />
            {hasChatMention ? (
              <span className="activity-mention-badge" title="You were mentioned in chat!">
                @
              </span>
            ) : unreadChatCount > 0 ? (
              <span className="activity-unread-badge">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            ) : null}
          </button>
          <button
            className={`activity-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            title="Shared Files"
          >
            <HardDrive size={18} />
          </button>
          <button
            className={`activity-tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
            onClick={() => setActiveTab('packages')}
            title="Package Manager"
          >
            <Package size={18} />
          </button>
          <button
            className={`activity-tab-btn ${showWhiteboard ? 'active' : ''}`}
            onClick={() => setShowWhiteboard(prev => !prev)}
            title="Interactive Whiteboard (Draw, Pen/Brush/Shapes, Live Share, Drag & Mini-Stick)"
            style={{
              position: 'relative',
              color: showWhiteboard ? 'var(--accent-primary, #38BDF8)' : undefined
            }}
          >
            <PenTool size={18} />
          </button>
          <button
            className="activity-tab-btn"
            onClick={() => setShowParticipantsModal(true)}
            title="Participants & Join Requests"
          >
            <Users size={18} />
          </button>

          {/* ❓ Creator Contact & Info (? Symbol) */}
          <div
            className="activity-creator-wrap"
            onMouseEnter={handleCreatorMouseEnter}
            onMouseLeave={handleCreatorMouseLeave}
          >
            <button
              type="button"
              className={`activity-tab-btn ${showCreatorPopup ? 'active' : ''}`}
              onClick={handleCreatorClick}
              title="Platform Creator & Contact (Saurav B) - Click to keep open"
              aria-label="Platform Creator & Contact"
            >
              <HelpCircle size={18} />
            </button>

            {showCreatorPopup && (
              <div
                className="activity-creator-popover"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleCreatorMouseEnter}
                onMouseLeave={handleCreatorMouseLeave}
              >
                <div className="activity-creator-popover-header">
                  <div className="activity-creator-avatar">
                    SB
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="activity-creator-name">Saurav B</div>
                    <div className="activity-creator-role">Platform Creator &amp; Developer</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-subtle btn-icon sm"
                    onClick={handleCloseCreatorPopup}
                    title="Close Creator Contact"
                    style={{ width: '22px', height: '22px', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="activity-creator-links">
                  <a
                    href="mailto:saurav04atg@gmail.com"
                    className="activity-creator-link"
                    title="Send Email"
                  >
                    <span>✉️</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>saurav04atg@gmail.com</span>
                  </a>
                  <a
                    href="https://github.com/aurenox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-creator-link"
                    title="Visit GitHub Profile"
                  >
                    <span>🐙</span>
                    <span>github.com/aurenox</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/saurav-b-a864a7326/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-creator-link"
                    title="Visit LinkedIn Profile"
                  >
                    <span>💼</span>
                    <span>LinkedIn: Saurav B</span>
                  </a>
                </div>

                <div className="nav-creator-bug-report" style={{ marginTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}>
                    <span>🐞</span>
                    <span>Report Bugs &amp; Suggestions</span>
                  </div>
                  <a
                    href="mailto:saurav04atg@gmail.com?subject=L2gether%20Bug%20Report%20%2F%20Feature%20Request"
                    className="btn btn-secondary btn-sm"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                      padding: '4px 8px'
                    }}
                  >
                    <Mail size={12} />
                    <span>saurav04atg@gmail.com</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Tab 1: Room Overview */}
        {activeTab === 'overview' && (
          <RoomOverview
            room={room}
            participantCount={currentParticipantCount}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenQR={() => setShowQRModal(true)}
            onOpenParticipants={() => setShowParticipantsModal(true)}
            onOpenAudioHelp={() => setShowAudioHelpModal(true)}
            onOpenGuide={() => setShowGuideModal(true)}
          />
        )}

        {/* Tab 2: Code Editor Workspace */}
        {activeTab === 'code' && (
          <div
            style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleContainerTouchEnd}
          >
            {/* Mobile backdrop to dismiss file explorer */}
            {showExplorer && (
              <div
                className="file-explorer-mobile-backdrop"
                onClick={() => setShowExplorer(false)}
                title="Click or swipe left to dismiss file explorer"
              />
            )}

            {/* File Explorer Tree (Collapsible for mobile/tablet with swipe-to-left support) */}
            {showExplorer && (
              <div
                className="file-explorer-swipe-wrapper"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <FileExplorer
                  files={files}
                  activeFilePath={activeFilePath}
                  onSelectFile={handleSelectFile}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onRename={handleRename}
                  onDelete={handleDeleteFile}
                  onBatchMove={handleBatchMove}
                  onBatchCopy={handleBatchCopy}
                  onDropFiles={handleDropFiles}
                  onExportZip={handleExportZip}
                  onImportZip={handleImportZip}
                  collaborators={collaborators}
                  isEditingLocked={isEditingLocked}
                  lockedFiles={lockedFiles}
                  onToggleFileLock={handleToggleFileLock}
                  isOwner={room?.isOwner}
                  onCloseExplorer={() => setShowExplorer(false)}
                />
              </div>
            )}

            {/* Main Editor & Dock */}
            <div
              className="editor-main-container"
              style={{ position: 'relative' }}
              onDragEnter={(e) => {
                if (isEditingLocked && !room?.isOwner) return;
                e.preventDefault();
                setIsDraggingOverEditor(true);
              }}
              onDragOver={(e) => {
                if (isEditingLocked && !room?.isOwner) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                if (!isDraggingOverEditor) setIsDraggingOverEditor(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsDraggingOverEditor(false);
                }
              }}
              onDrop={async (e) => {
                if (isEditingLocked && !room?.isOwner) return;
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOverEditor(false);
                try {
                  const items = await processDroppedItems(e, '');
                  if (items && items.length > 0) {
                    await handleDropFiles(items, '');
                  }
                } catch (err) {
                  console.error('Editor drop error:', err);
                }
              }}
            >
              {/* Drag & Drop Visual Dropzone Overlay */}
              {isDraggingOverEditor && (
                <div className="editor-dropzone-overlay">
                  <div className="editor-dropzone-content">
                    <Upload size={40} className="dropzone-icon" />
                    <h3>Drop files or images to import into workspace</h3>
                    <p>Files will be added to the project and opened immediately.</p>
                  </div>
                </div>
              )}

              {/* Tab Bar */}
              <TabBar
                openTabs={openTabs}
                activeFilePath={activeFilePath}
                onSelectTab={handleSelectFile}
                onCloseTab={handleCloseTab}
                isDirty={isDirty}
                collaborators={collaborators}
                lockedFiles={lockedFiles}
                autoFollowHost={autoFollowHost}
                onToggleAutoFollow={() => setAutoFollowHost((v) => !v)}
                isHost={room?.isOwner}
              />

              {/* Editor Toolbar */}
              <div className="editor-toolbar">
                <div className="editor-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {/* Explorer Toggle */}
                  <button
                    className={`btn ${showExplorer ? 'btn-secondary' : 'btn-subtle'} btn-sm`}
                    onClick={() => setShowExplorer(!showExplorer)}
                    title={showExplorer ? 'Hide File Explorer' : 'Show File Explorer'}
                  >
                    <FolderTree size={13} />
                    <span className="hide-on-mobile">Files</span>
                  </button>

                  {/* 🔒 LOCK CONTROLS ON CODE EDITING PAGE */}
                  {room?.isOwner ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                      {(isEditingLocked || (lockedFiles || []).includes('*')) ? (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={handleToggleWorkspaceLock}
                          title="Entire workspace is locked for participants. Click to unlock all files."
                          style={{
                            height: '28px',
                            padding: '0 8px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Lock size={12} />
                          <span>All Locked (Unlock All)</span>
                        </button>
                      ) : (
                        <>
                          <button
                            className={`btn btn-sm ${(lockedFiles || []).includes(activeFilePath) ? 'btn-warning' : 'btn-secondary'}`}
                            onClick={() => handleToggleFileLock(activeFilePath)}
                            disabled={!activeFilePath}
                            title={
                              (lockedFiles || []).includes(activeFilePath)
                                ? `Unlock ${activeFilePath} (allow participants to edit)`
                                : `Lock ${activeFilePath} (prevent editing by participants)`
                            }
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              fontSize: '0.75rem',
                              borderColor: (lockedFiles || []).includes(activeFilePath) ? 'var(--state-warning, #f59e0b)' : undefined,
                              color: (lockedFiles || []).includes(activeFilePath) ? '#F59E0B' : undefined,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {(lockedFiles || []).includes(activeFilePath) ? <Lock size={12} /> : <Unlock size={12} />}
                            <span>{(lockedFiles || []).includes(activeFilePath) ? `Locked (${activeFilePath?.split('/').pop() || 'File'})` : 'Lock File'}</span>
                          </button>

                          <button
                            className="btn btn-sm btn-subtle"
                            onClick={handleToggleWorkspaceLock}
                            title="Lock All Files for Participants"
                            style={{ height: '28px', padding: '0 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Shield size={11} />
                            <span className="hide-on-mobile">Lock All</span>
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      {isCurrentFileLocked ? (
                        <span
                          className="badge badge-warning"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                          title="Host has locked editing for this file"
                        >
                          <Lock size={12} />
                          <span>Read-Only (Locked by Host)</span>
                        </span>
                      ) : (
                        <span
                          className="badge badge-success"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          <span>🟢 Editable</span>
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowTemplatePicker(true)}
                    title="Open Universal Starter Template Picker (Shift + !)"
                  >
                    <Sparkles size={13} color="var(--accent-primary)" />
                    <span className="hide-on-mobile">Templates (Shift+!)</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('preview')}
                    title="Open Live Web Preview tab"
                  >
                    <Globe size={13} />
                    <span className="hide-on-mobile">Live Preview</span>
                  </button>
                </div>

                <div className="editor-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Live Follow Host Toggle for Participants */}
                  {!room?.isOwner && (
                    <button
                      className={`btn btn-sm ${autoFollowHost ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAutoFollowHost((v) => !v)}
                      title={
                        autoFollowHost
                          ? 'Auto-Follow Host is ON: Your editor automatically moves whenever the host switches files'
                          : 'Turn ON Auto-Follow Host: Automatically stay on the same file the host is viewing/editing'
                      }
                      style={{ fontSize: '0.72rem', height: '28px', padding: '0 8px', gap: '4px' }}
                    >
                      <Radio size={12} className={autoFollowHost ? 'live-pulse' : ''} />
                      <span className="hide-on-mobile">{autoFollowHost ? '📡 Live Follow: ON' : 'Live Follow: OFF'}</span>
                    </button>
                  )}

                  {isSaving ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saving...</span>
                  ) : isDirty ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Unsaved</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--state-success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={12} /> Saved
                    </span>
                  )}
                  <button
                    className="btn btn-subtle btn-icon sm"
                    onClick={() => handleSaveFile()}
                    title="Save File (Ctrl+S)"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </div>

              {/* Editing Lock Banner */}
              {(isCurrentFileLocked || (room?.isOwner && ((lockedFiles || []).length > 0 || isEditingLocked))) && (
                <div
                  className="editing-lock-banner"
                  style={{
                    backgroundColor: isCurrentFileLocked ? 'var(--state-warning-bg)' : 'rgba(59, 130, 246, 0.08)',
                    borderColor: isCurrentFileLocked ? 'var(--border-color)' : 'rgba(59, 130, 246, 0.25)',
                    padding: '0.4rem 0.85rem',
                    color: 'var(--text-main)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={13} color={isCurrentFileLocked ? 'var(--state-warning, #f59e0b)' : 'var(--accent-primary)'} />
                    {room?.isOwner ? (
                      <span>
                        <strong>Owner Permission Active:</strong>{' '}
                        {(lockedFiles || []).includes('*') || isEditingLocked
                          ? 'Entire workspace is locked for participants.'
                          : `Locked files for participants: ${(lockedFiles || []).join(', ')}.`}
                      </span>
                    ) : (
                      <span>
                        <strong>File Locked:</strong> Editing for <code>{activeFilePath}</code> is locked by the room host.
                      </span>
                    )}
                  </span>
                  {room?.isOwner && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '1px 8px', fontSize: '0.7rem', height: '22px' }}
                      onClick={
                        (lockedFiles || []).includes('*') || isEditingLocked
                          ? handleToggleWorkspaceLock
                          : (lockedFiles || []).includes(activeFilePath)
                            ? () => handleToggleFileLock(activeFilePath)
                            : handleToggleWorkspaceLock
                      }
                    >
                      {(lockedFiles || []).includes('*') || isEditingLocked
                        ? 'Unlock All'
                        : (lockedFiles || []).includes(activeFilePath)
                          ? `Unlock ${activeFilePath?.split('/').pop() || activeFilePath}`
                          : 'Unlock All'}
                    </button>
                  )}
                </div>
              )}

              {/* Monaco Editor or Image Preview Mount */}
              {activeFilePath ? (
                isImageFile(activeFilePath) && (!activeFilePath.toLowerCase().endsWith('.svg') || !viewSvgAsSource) ? (
                  <ImagePreviewPanel
                    filePath={activeFilePath}
                    content={activeFileContent}
                    onSwitchToSource={activeFilePath.toLowerCase().endsWith('.svg') ? () => setViewSvgAsSource(true) : null}
                    readOnly={isCurrentFileLocked}
                  />
                ) : (
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {activeFilePath.toLowerCase().endsWith('.svg') && viewSvgAsSource && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.3rem 0.85rem',
                          backgroundColor: '#111520',
                          borderBottom: '1px solid #232A3B',
                          fontSize: '0.75rem'
                        }}
                      >
                        <span style={{ color: '#94A3B8' }}>Editing SVG XML Source Markup</span>
                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ fontSize: '0.72rem', padding: '1px 8px' }}
                          onClick={() => setViewSvgAsSource(false)}
                        >
                          🎨 Switch to Visual Preview
                        </button>
                      </div>
                    )}
                    <MonacoEditorWrapper
                      filePath={activeFilePath}
                      content={activeFileContent}
                      onChange={handleContentChange}
                      onSave={() => handleSaveFile()}
                      onOpenTemplatePicker={() => setShowTemplatePicker(true)}
                      socket={socketRef.current}
                      roomId={roomId}
                      userSession={session}
                      readOnly={isCurrentFileLocked}
                    />
                  </div>
                )
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Select or create a file in the Project Explorer to begin coding.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Live Web Preview */}
        {activeTab === 'preview' && (
          <LivePreview
            files={files}
            activeFilePath={activeFilePath}
            onSelectFile={handleSelectFile}
          />
        )}

        {/* Tab 4: Real-Time Chat (Kept mounted so chat history persists across tab switching) */}
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flex: 1, height: '100%', overflow: 'hidden' }}>
          <ChatPanel
            roomId={roomId}
            userSession={session}
            socket={socketInstance || socketRef.current}
            participants={participants}
          />
        </div>

        {/* Tab 5: Shared Files */}
        {activeTab === 'files' && (
          <FilesPanel
            roomId={roomId}
            userSession={session}
            isOwner={room?.isOwner}
          />
        )}

        {/* Tab 6: Package Manager */}
        {activeTab === 'packages' && (
          <PackageManagerPanel
            roomId={roomId}
            files={files}
            onSwitchTab={setActiveTab}
            onFilesUpdated={handleReloadWorkspaceFiles}
          />
        )}
      </div>

      {/* Modals */}
      {showQRModal && (
        <ShareQRModal room={room} onClose={() => setShowQRModal(false)} />
      )}

      {showParticipantsModal && (
        <ParticipantListModal
          roomId={roomId}
          isOwner={room?.isOwner}
          currentSessionId={session?.sessionId}
          onClose={() => setShowParticipantsModal(false)}
        />
      )}

      {showSettingsModal && (
        <RoomSettingsModal
          room={room}
          isOwner={room?.isOwner}
          onUpdateRoom={(upd) => setRoom(prev => ({ ...prev, ...upd }))}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showTemplatePicker && (
        <TemplatePickerModal
          activeFilePath={activeFilePath}
          currentFileContent={activeFileContent}
          onInsertTemplate={(tmplContent) => {
            handleContentChange(tmplContent);
            handleSaveFile(activeFilePath, tmplContent);
          }}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Audio Echo Quality & Prevention Help Modal */}
      <AudioEchoHelpModal
        isOpen={showAudioHelpModal}
        onClose={() => setShowAudioHelpModal(false)}
      />

      {/* First-Time User Guide & Workspace Help Modal */}
      <FirstTimeUserGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onOpenAudioHelp={() => setShowAudioHelpModal(true)}
      />

      {/* Floating Call Widget on Mobile */}
      <MobileAudioCallBar roomId={roomId} />

      {/* Audio Permission & HTTP Insecure Setup Modal */}
      <AudioPermissionModal />

      {/* Interactive Collaborative Whiteboard (Slide Drawer / Floating / Mini-Stick) */}
      <WhiteboardModal
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        socket={socketInstance || socketRef.current}
        roomId={roomId}
        currentUser={session}
        onShareToChat={(imageDataUrl) => {
          const s = socketInstance || socketRef.current;
          if (s) {
            s.emit('whiteboard_share_snapshot', {
              roomId,
              dataUrl: imageDataUrl,
              title: 'Whiteboard Drawing Snapshot'
            });
          }
        }}
      />
    </div>
  );
}

