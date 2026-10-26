import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Code2,
  Search,
  Copy,
  Check,
  FileText,
  Download,
  RefreshCw,
  X,
  MessageSquare,
  Reply,
  CornerUpLeft,
  Palette,
  Maximize2
} from 'lucide-react';
import api from '../../services/api';

export default function ChatPanel({
  roomId,
  userSession,
  socket,
  participants = []
}) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [cursorPos, setCursorPos] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [replyingTo, setReplyingTo] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const [localParticipants, setLocalParticipants] = useState(participants || []);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const isScrolledToBottomRef = useRef(true);

  // Sync participants prop and fetch from API if not yet loaded
  useEffect(() => {
    if (participants && participants.length > 0) {
      setLocalParticipants(participants);
    } else if (roomId) {
      api.getParticipants(roomId).then((res) => {
        if (res?.participants && Array.isArray(res.participants)) {
          setLocalParticipants(res.participants);
        }
      }).catch(() => {});
    }
  }, [roomId, participants]);

  // Helper to deduplicate messages by ID and reconcile temporary placeholders
  const mergeMessages = (existingList = [], incomingList = []) => {
    const map = new Map();
    for (const m of existingList || []) {
      if (m?.id) map.set(m.id, m);
    }
    for (const m of incomingList || []) {
      if (!m?.id) continue;
      // If incoming confirmed message has a tempId, remove the temporary placeholder
      if (m.tempId && map.has(m.tempId)) {
        map.delete(m.tempId);
      }
      // If incoming message is permanent, also remove any temp placeholder with identical content from same sender
      if (!m.id.startsWith('msg_tmp_')) {
        for (const [key, val] of map.entries()) {
          if (
            key.startsWith('msg_tmp_') &&
            val.content === m.content &&
            (val.sender_session_id === m.sender_session_id || val.sender_name === m.sender_name)
          ) {
            map.delete(key);
          }
        }
      }
      map.set(m.id, m);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
  };

  // Scroll to bottom (Edge & Safari compatible)
  const scrollToBottom = useCallback((force = false) => {
    setTimeout(() => {
      if (containerRef.current && (force || isScrolledToBottomRef.current)) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      if (force || isScrolledToBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 40);
  }, []);

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // Load message history with cache-busting
  const loadMessages = useCallback(async (showSpinner = false) => {
    if (!roomId) return;
    if (showSpinner) setIsRefreshing(true);

    try {
      const params = {};
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await api.getMessages(roomId, params);

      if (res && Array.isArray(res.messages)) {
        setMessages((prev) => {
          // If searching, replace entirely; otherwise merge
          if (searchQuery.trim()) return res.messages;
          return mergeMessages(prev, res.messages);
        });
        setLastRefreshedAt(Date.now());
      }
    } catch (e) {
      console.warn('[Chat] Failed to load messages:', e);
    } finally {
      if (showSpinner) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, [roomId, searchQuery]);

  // Initial load on mount or search query change
  useEffect(() => {
    loadMessages(true);
    scrollToBottom(true);
  }, [roomId, searchQuery, loadMessages, scrollToBottom]);

  // Periodic background fallback sync (vital for Edge / sleeping tabs / firewalled websockets)
  useEffect(() => {
    if (!roomId) return;
    const syncInterval = setInterval(() => {
      loadMessages(false);
    }, 3500);

    return () => clearInterval(syncInterval);
  }, [roomId, loadMessages]);

  // Window focus & visibility recovery for Edge / browser tab resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && roomId) {
        loadMessages(false);
        if (socket && !socket.connected) {
          try { socket.connect(); } catch (e) {}
        }
      }
    };

    const handleWindowFocus = () => {
      if (roomId) {
        loadMessages(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [roomId, socket, loadMessages]);

  // Socket event listeners for real-time messages & room connection
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (!msg) return;
      setMessages((prev) => mergeMessages(prev, [msg]));
      scrollToBottom();
    };

    const handleReconnect = () => {
      if (roomId) {
        socket.emit('join_room', { roomId });
        loadMessages(false);
      }
    };

    const handleUserJoined = ({ sessionId, displayName }) => {
      setLocalParticipants((prev) => {
        if (prev.some((p) => (p.session_id || p.sessionId) === sessionId || p.display_name === displayName)) {
          return prev;
        }
        return [...prev, { session_id: sessionId, display_name: displayName, role: 'member' }];
      });
    };

    const handleUserLeft = ({ sessionId }) => {
      setLocalParticipants((prev) => prev.filter((p) => (p.session_id || p.sessionId) !== sessionId));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('connect', handleReconnect);
    socket.on('reconnect', handleReconnect);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    // If socket is already connected when this mounts, ensure room is joined
    if (socket.connected && roomId) {
      socket.emit('join_room', { roomId });
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('connect', handleReconnect);
      socket.off('reconnect', handleReconnect);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
    };
  }, [socket, roomId, loadMessages, scrollToBottom]);

  // Handle typing & mention suggestions (@all, @everyone, or specific teammate)
  const handleInputChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setInputVal(val);
    setCursorPos(pos);

    // Detect '@' query before cursor
    const textBefore = val.slice(0, pos);
    const atIndex = textBefore.lastIndexOf('@');

    if (atIndex !== -1 && (atIndex === 0 || /\s/.test(textBefore[atIndex - 1]))) {
      const query = textBefore.slice(atIndex + 1).toLowerCase();
      // Only suggest if no newline between '@' and cursor and reasonable length
      if (!textBefore.slice(atIndex).includes('\n') && textBefore.slice(atIndex).length <= 25) {
        const mySessionId = userSession?.sessionId || userSession?.id;
        const myName = (userSession?.displayName || '').trim().toLowerCase();

        const allOptions = [
          { id: '__all__', display_name: 'all', isAll: true },
          { id: '__everyone__', display_name: 'everyone', isAll: true }
        ];

        // Exclude current user so sender NEVER sees themselves in mention suggestions
        const roster = (localParticipants || [])
          .filter((p) => {
            if (!p || !p.display_name) return false;
            const pSessionId = p.session_id || p.sessionId;
            const pName = p.display_name.trim().toLowerCase();
            if (mySessionId && pSessionId && pSessionId === mySessionId) return false;
            if (myName && pName === myName) return false;
            if (pName === 'all' || pName === 'everyone') return false;
            return true;
          })
          .map((p) => ({
            id: p.session_id || p.display_name,
            display_name: p.display_name,
            isAll: false
          }));

        const combined = [...allOptions, ...roster];
        const filtered = query.trim()
          ? combined.filter((p) => p.display_name.toLowerCase().includes(query.trim()))
          : combined;

        setMentionSuggestions(filtered);
        return;
      }
    }
    setMentionSuggestions([]);
  };

  const handleSelectMention = (name) => {
    const textBefore = inputVal.slice(0, cursorPos);
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex !== -1) {
      const prefix = textBefore.slice(0, atIndex);
      const textAfter = inputVal.slice(cursorPos);
      const nextVal = `${prefix}@${name} ${textAfter}`;
      setInputVal(nextVal);
      setMentionSuggestions([]);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = prefix.length + name.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    }
  };

  // Scroll to original message when quoted reply is clicked
  const scrollToMessage = (msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-scroll');
      setTimeout(() => el.classList.remove('highlight-scroll'), 2000);
    }
  };

  // Select message or click arrow button to reply/mention
  const handleReplyOrMention = (msg) => {
    if (!msg) return;

    setReplyingTo({
      id: msg.id,
      sender: msg.sender_name || 'Teammate',
      content: (msg.content || '').slice(0, 80)
    });

    const targetName = msg.sender_name;
    const isMe =
      (userSession?.sessionId && msg.sender_session_id === userSession.sessionId) ||
      (userSession?.displayName && msg.sender_name === userSession.displayName);

    // If selecting/replying to someone else, auto-insert @TargetName so they are also mentioned
    if (targetName && !isMe) {
      const mentionTag = `@${targetName} `;
      setInputVal((prev) => {
        if (prev.includes(`@${targetName}`)) return prev;
        return `${mentionTag}${prev}`;
      });
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 40);
  };

  // Send plain text message
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const textToSend = inputVal.trim();
    const meta = replyingTo ? { replyTo: replyingTo } : null;
    setInputVal('');
    setMentionSuggestions([]);
    setReplyingTo(null);

    // Optimistic message placeholder
    const tempMsgId = `msg_tmp_${Date.now()}`;
    const optimisticMsg = {
      id: tempMsgId,
      room_id: roomId,
      sender_session_id: userSession?.sessionId,
      sender_name: userSession?.displayName || 'You',
      message_type: 'text',
      content: textToSend,
      metadata: meta,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => mergeMessages(prev, [optimisticMsg]));
    scrollToBottom(true);

    try {
      if (socket && socket.connected) {
        socket.emit('send_message', {
          roomId,
          content: textToSend,
          messageType: 'text',
          metadata: meta,
          tempId: tempMsgId
        });
      } else {
        const res = await api.sendMessage(roomId, {
          content: textToSend,
          messageType: 'text',
          metadata: meta
        });

        if (res?.message) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempMsgId);
            return mergeMessages(filtered, [res.message]);
          });
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to send message:', e);
    }
  };

  // Send code snippet
  const handleSendSnippet = async () => {
    if (!codeSnippet.trim()) return;

    const meta = { language: codeLanguage };
    const textToSend = codeSnippet.trim();
    setCodeSnippet('');
    setShowCodeModal(false);

    const tempMsgId = `msg_tmp_${Date.now()}`;
    const optimisticMsg = {
      id: tempMsgId,
      room_id: roomId,
      sender_session_id: userSession?.sessionId,
      sender_name: userSession?.displayName || 'You',
      message_type: 'code',
      content: textToSend,
      metadata: meta,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => mergeMessages(prev, [optimisticMsg]));
    scrollToBottom(true);

    try {
      if (socket && socket.connected) {
        socket.emit('send_message', {
          roomId,
          content: textToSend,
          messageType: 'code',
          metadata: meta,
          tempId: tempMsgId
        });
      } else {
        const res = await api.sendMessage(roomId, {
          content: textToSend,
          messageType: 'code',
          metadata: meta
        });

        if (res?.message) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempMsgId);
            return mergeMessages(filtered, [res.message]);
          });
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to send code snippet:', e);
    }
  };

  const handleCopyCode = async (snippet, msgId) => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippetId(msgId);
      setTimeout(() => setCopiedSnippetId(null), 2000);
    } catch (e) {
      prompt('Copy snippet:', snippet);
    }
  };

  return (
    <div className="chat-pane">
      {/* Chat Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <MessageSquare size={16} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
            Live Chat
          </h3>
          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
            {messages.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-search-input"
              style={{ paddingLeft: '26px', width: '130px' }}
            />
          </div>

          {/* Manual Refresh Button (Edge Sync Solution) */}
          <button
            className="btn btn-secondary btn-icon sm"
            onClick={() => loadMessages(true)}
            title="Refresh Chat (Sync latest messages)"
            disabled={isRefreshing}
          >
            <RefreshCw
              size={13}
              style={{
                animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
                transition: 'transform 0.3s ease'
              }}
            />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        className="chat-messages-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
              <MessageSquare size={22} color="var(--accent-primary)" />
            </div>
            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              No messages yet
            </p>
            <p style={{ fontSize: '0.825rem', maxWidth: '280px', margin: '0 auto' }}>
              Say hello to your teammates or share a code snippet to start collaborating!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mySessionId = userSession?.sessionId || userSession?.id;
            const isOwn = (mySessionId && m.sender_session_id === mySessionId) ||
                          (userSession?.displayName && m.sender_name === userSession.displayName);
            const isSystem = m.message_type === 'system';
            const isCode = m.message_type === 'code';
            const isFile = m.message_type === 'file';

            // Check if message is an image message or embeds a markdown image or data URL
            const rawContent = typeof m.content === 'string' ? m.content : '';
            const imgMatch = rawContent.match(/!\[(.*?)\]\(((?:data:image\/[^)]+)|(?:https?:\/\/[^)]+))\)/);
            const directDataUrlMatch = !imgMatch ? rawContent.match(/data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/i) : null;
            const isImage = m.message_type === 'image' || Boolean(m.metadata?.imageUrl) || Boolean(imgMatch) || Boolean(directDataUrlMatch);
            const imageUrl = m.metadata?.imageUrl || (imgMatch ? imgMatch[2] : (directDataUrlMatch ? directDataUrlMatch[0] : null));
            const imageTitle = m.metadata?.title || (imgMatch ? imgMatch[1] : 'Whiteboard Snapshot');
            const cleanTextWithoutImg = rawContent
              .replace(/!\[.*?\]\((?:data:image\/[^)]+|https?:\/\/[^)]+)\)/g, '')
              .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/gi, '')
              .trim();

            // Check if current user or @all / @everyone is mentioned in this message
            // Crucial: Senders NEVER get marked as mentioned on their own sent messages!
            const myName = (userSession?.displayName || '').trim().toLowerCase();
            const contentLower = (m.content || '').toLowerCase();
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

            const isMentioned = !isOwn && (isAllMention || isDirectMention);

            const timeStr = new Date(m.created_at || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={m.id}
                id={`msg-${m.id}`}
                className={`message-item ${isOwn ? 'own' : ''} ${isSystem ? 'system' : ''} ${isMentioned ? 'mentioned' : ''}`}
              >
                {!isSystem && (
                  <div className="message-header" style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                    <span
                      className="message-sender"
                      style={{ cursor: isOwn ? 'default' : 'pointer' }}
                      onClick={() => !isOwn && handleReplyOrMention(m)}
                      title={isOwn ? 'You' : `Click to mention @${m.sender_name}`}
                    >
                      {isOwn ? 'You' : m.sender_name}
                    </span>
                    <span className="message-time">{timeStr}</span>
                    <button
                      type="button"
                      className="btn-msg-reply"
                      onClick={() => handleReplyOrMention(m)}
                      title={isOwn ? 'Reference your message' : `Reply to / mention ${m.sender_name}`}
                    >
                      <Reply size={12} />
                      <span>Reply</span>
                    </button>
                  </div>
                )}

                <div className="message-bubble">
                  {/* Quoted Reply Preview */}
                  {m.metadata?.replyTo && (
                    <div
                      className="message-quoted-reply"
                      onClick={() => scrollToMessage(m.metadata.replyTo.id)}
                      title="Click to view quoted message"
                    >
                      <CornerUpLeft size={11} className="quoted-reply-icon" />
                      <span className="quoted-reply-sender">
                        @{m.metadata.replyTo.sender}:
                      </span>
                      <span className="quoted-reply-text">
                        {m.metadata.replyTo.content}
                      </span>
                    </div>
                  )}
                  {isCode ? (
                    <div className="code-message-block">
                      <div className="code-message-header">
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.72rem' }}>
                          {m.metadata?.language || 'code'}
                        </span>
                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => handleCopyCode(m.content, m.id)}
                        >
                          {copiedSnippetId === m.id ? (
                            <Check size={12} color="var(--state-success)" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{copiedSnippetId === m.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="code-message-content">
                        <code>{m.content}</code>
                      </pre>
                    </div>
                  ) : isFile ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <FileText size={16} color="var(--accent-primary)" />
                        <strong>{m.content}</strong>
                      </div>
                      {m.metadata?.fileId && (
                        <a
                          href={api.getFileDownloadUrl(roomId, m.metadata.fileId)}
                          download
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '0.35rem', textDecoration: 'none' }}
                        >
                          <Download size={13} />
                          <span>Download File</span>
                        </a>
                      )}
                    </div>
                  ) : isImage && imageUrl ? (
                    <div className="chat-image-block" style={{ marginTop: '2px' }}>
                      {cleanTextWithoutImg && (
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Palette size={14} color="var(--accent-primary)" />
                          <span>{cleanTextWithoutImg.replace(/[🎨*]/g, '').trim() || 'Whiteboard Snapshot'}</span>
                        </div>
                      )}
                      <div
                        style={{
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#090D16',
                          cursor: 'pointer',
                          maxWidth: '380px',
                          position: 'relative'
                        }}
                        onClick={() => setPreviewImageModal(imageUrl)}
                        title="Click to view full resolution"
                      >
                        <img
                          src={imageUrl}
                          alt={imageTitle || 'Whiteboard Snapshot'}
                          style={{
                            width: '100%',
                            maxHeight: '260px',
                            objectFit: 'contain',
                            display: 'block',
                            backgroundColor: '#0B0F19'
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            color: '#E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Maximize2 size={11} />
                          <span>View Full</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <a
                          href={imageUrl}
                          download={`whiteboard_${m.id || Date.now()}.png`}
                          className="btn btn-subtle btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 8px', textDecoration: 'none', height: '22px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={12} />
                          <span>Download Image</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span>
                      {m.content?.split(/(@[a-zA-Z0-9_\s-]{1,25}\b|@everyone\b|@all\b)/gi).map((part, idx) => {
                        if (part.startsWith('@')) {
                          const rawName = part.slice(1).trim().toLowerCase();
                          const isAll =
                            rawName === 'all' ||
                            rawName === 'everyone' ||
                            rawName === 'every one' ||
                            rawName === 'everybody';
                          // Crucial: Senders never have mention-me highlight on their own sent messages
                          const isMe = !isOwn && myName && (rawName === myName || rawName === myName.replace(/\s+/g, ''));
                          return (
                            <span
                              key={idx}
                              className={`chat-mention-pill ${isAll ? 'mention-all' : ''} ${isMe ? 'mention-me' : ''}`}
                              title={isAll ? 'Mentions everyone in room' : isMe ? 'Mentions you' : `Mentions ${part}`}
                            >
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mention Auto-Complete Popup */}
      {mentionSuggestions.length > 0 && (
        <div className="mention-popup">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mention:</span>
          {mentionSuggestions.map((item) => {
            const name = typeof item === 'string' ? item : item.display_name;
            const isAll = item.isAll || name.toLowerCase() === 'all' || name.toLowerCase() === 'everyone';
            return (
              <button
                key={item.id || name}
                type="button"
                className={`badge ${isAll ? 'badge-warning' : 'badge-primary'} mention-suggestion-pill`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}
                onClick={() => handleSelectMention(name)}
                title={isAll ? 'Mention everyone in workspace' : `Mention ${name}`}
              >
                <span>@{name}</span>
                {isAll && <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>(Everyone)</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Reply Banner */}
      {replyingTo && (
        <div className="chat-reply-banner">
          <div className="reply-banner-left">
            <CornerUpLeft size={13} className="reply-banner-icon" />
            <div className="reply-banner-text">
              <span className="reply-banner-sender">
                Replying to <strong>{replyingTo.sender}</strong>:
              </span>
              <span className="reply-banner-snippet">
                "{replyingTo.content}"
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon sm btn-subtle reply-banner-close"
            onClick={() => setReplyingTo(null)}
            title="Cancel reply"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder="Message teammates (type @ to mention, Enter to send)..."
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && mentionSuggestions.length > 0) {
              setMentionSuggestions([]);
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="chat-textarea"
        />

        <div className="chat-input-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCodeModal(true)}
            title="Share Formatted Code Snippet"
          >
            <Code2 size={14} />
            <span className="hide-on-mobile">Snippet</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={!inputVal.trim()}
          >
            <Send size={14} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Code Snippet Modal */}
      {showCodeModal && (
        <div className="modal-backdrop" onClick={() => setShowCodeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '92%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Share Code Snippet</h3>
              <button className="btn btn-subtle btn-icon sm" onClick={() => setShowCodeModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="form-select"
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="c">C</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Code</label>
                <textarea
                  rows={8}
                  placeholder="// Paste or write code snippet here..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  className="form-textarea"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCodeModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSendSnippet}
                disabled={!codeSnippet.trim()}
              >
                Post Snippet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Resolution Whiteboard & Image Previews */}
      {previewImageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '8px' }}>
              <a
                href={previewImageModal}
                download={`whiteboard_preview_${Date.now()}.png`}
                className="btn btn-primary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                <Download size={14} />
                <span>Download Image</span>
              </a>
              <button
                className="btn btn-subtle btn-sm"
                onClick={() => setPreviewImageModal(null)}
                title="Close Preview"
                style={{ width: '28px', height: '28px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={previewImageModal}
              alt="Full Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#0F172A'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
