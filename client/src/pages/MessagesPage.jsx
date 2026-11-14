/**
 * MessagesPage.jsx — In-App Messaging
 * Task 11: Conversation list (left panel) + message thread (right panel) + composer.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  listConversations,
  getConversation,
  startConversation,
  replyToConversation,
  markConversationRead,
} from '../services/messagingService';
import { useAuth } from '../context/AuthContext';
import '../styles/MessagesPage.css';

const MAX_BODY = 2000;

const MessagesPage = ({ onNavigate, prefill }) => {
  const { user, role } = useAuth();

  // ── Conversation list state ──────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState('');
  const [convPage, setConvPage] = useState(1);
  const [convPagination, setConvPagination] = useState({ pages: 1 });

  // ── Active conversation state ────────────────────────────────────────────
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');

  // ── Compose new conversation ─────────────────────────────────────────────
  const [showNewForm, setShowNewForm] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState(prefill?.recipientId || '');
  const [newRecipientName, setNewRecipientName] = useState(prefill?.recipientName || '');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newExpoId, setNewExpoId] = useState('');
  const [newSending, setNewSending] = useState(false);
  const [newError, setNewError] = useState('');

  // ── Reply state ──────────────────────────────────────────────────────────
  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');

  const messagesEndRef = useRef(null);

  // Open compose form if prefill provided
  useEffect(() => {
    if (prefill?.recipientId) {
      setShowNewForm(true);
      setNewRecipientId(prefill.recipientId);
      setNewRecipientName(prefill.recipientName || '');
    }
  }, [prefill]);

  // Scroll to bottom of thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load conversation list ───────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setConvLoading(true);
    setConvError('');
    try {
      const res = await listConversations({ page: convPage, limit: 20 });
      setConversations(res.data.data || []);
      setConvPagination(res.data.pagination || { pages: 1 });
    } catch (err) {
      setConvError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setConvLoading(false);
    }
  }, [convPage]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Load active conversation thread ─────────────────────────────────────
  const fetchThread = useCallback(async (convId) => {
    if (!convId) return;
    setThreadLoading(true);
    setThreadError('');
    setReplyBody('');
    setReplyError('');
    try {
      const res = await getConversation(convId, { limit: 100 });
      setActiveConv(res.data.data.conversation);
      setMessages(res.data.data.messages || []);
      // Mark as read
      await markConversationRead(convId);
      // Refresh conversation list to update unread badges
      fetchConversations();
    } catch (err) {
      setThreadError(err.response?.data?.message || 'Failed to load conversation');
    } finally {
      setThreadLoading(false);
    }
  }, [fetchConversations]);

  const handleSelectConversation = (convId) => {
    setActiveConvId(convId);
    setShowNewForm(false);
    fetchThread(convId);
  };

  // ── Send new conversation ────────────────────────────────────────────────
  const handleSendNew = async (e) => {
    e.preventDefault();
    setNewError('');

    if (!newRecipientId.trim()) return setNewError('Recipient ID is required');
    if (!newSubject.trim()) return setNewError('Subject is required');
    if (!newBody.trim()) return setNewError('Message is required');
    if (newBody.trim().length > MAX_BODY) return setNewError(`Max ${MAX_BODY} characters`);

    setNewSending(true);
    try {
      const payload = {
        recipientId: newRecipientId.trim(),
        subject: newSubject.trim(),
        body: newBody.trim(),
      };
      if (role === 'organizer' && newExpoId.trim()) {
        payload.expoId = newExpoId.trim();
      }
      const res = await startConversation(payload);
      const newConvId = res.data.data.conversation._id;
      setShowNewForm(false);
      setNewRecipientId('');
      setNewRecipientName('');
      setNewSubject('');
      setNewBody('');
      setNewExpoId('');
      await fetchConversations();
      handleSelectConversation(newConvId);
    } catch (err) {
      setNewError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setNewSending(false);
    }
  };

  // ── Send reply ───────────────────────────────────────────────────────────
  const handleReply = async (e) => {
    e.preventDefault();
    setReplyError('');
    if (!replyBody.trim()) return setReplyError('Message is required');
    if (replyBody.trim().length > MAX_BODY) return setReplyError(`Max ${MAX_BODY} characters`);

    setReplySending(true);
    try {
      const res = await replyToConversation(activeConvId, { body: replyBody.trim() });
      setMessages((prev) => [...prev, res.data.data]);
      setReplyBody('');
      fetchConversations(); // refresh unread badges
    } catch (err) {
      setReplyError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplySending(false);
    }
  };

  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFull = (d) =>
    d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className="messages-page">
      {/* ── Left panel: conversation list ── */}
      <aside className="conv-list-panel">
        <div className="conv-list-header">
          <h2 className="conv-list-title">Messages</h2>
          <button
            className="btn-new-conv"
            onClick={() => { setShowNewForm(true); setActiveConvId(null); setActiveConv(null); setMessages([]); }}
          >
            + New
          </button>
        </div>

        {convLoading ? (
          <div className="conv-list-loading"><div className="dashboard-spinner" /></div>
        ) : convError ? (
          <div className="conv-list-error">⚠️ {convError}</div>
        ) : conversations.length === 0 ? (
          <div className="conv-list-empty">
            <p>No conversations yet.</p>
            <button className="btn-start-first" onClick={() => setShowNewForm(true)}>
              Start a conversation
            </button>
          </div>
        ) : (
          <ul className="conv-list">
            {conversations.map((conv) => (
              <li
                key={conv._id}
                className={`conv-item ${conv._id === activeConvId ? 'conv-item-active' : ''} ${conv.unreadCount > 0 ? 'conv-item-unread' : ''}`}
                onClick={() => handleSelectConversation(conv._id)}
              >
                <div className="conv-item-top">
                  <span className="conv-item-subject">{conv.subject}</span>
                  <span className="conv-item-time">{formatTime(conv.lastMessageAt)}</span>
                </div>
                <div className="conv-item-bottom">
                  <span className="conv-item-other">
                    {conv.otherParticipant?.name || 'Unknown'}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="conv-unread-badge">{conv.unreadCount}</span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="conv-item-preview">{conv.lastMessage.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {convPagination.pages > 1 && (
          <div className="conv-pagination">
            <button disabled={convPage <= 1} onClick={() => setConvPage((p) => p - 1)}>‹</button>
            <span>{convPage}/{convPagination.pages}</span>
            <button disabled={convPage >= convPagination.pages} onClick={() => setConvPage((p) => p + 1)}>›</button>
          </div>
        )}
      </aside>

      {/* ── Right panel: thread or compose ── */}
      <main className="conv-thread-panel">
        {/* New conversation form */}
        {showNewForm && (
          <div className="new-conv-form-wrap">
            <h3 className="new-conv-title">New Message</h3>
            <form onSubmit={handleSendNew} className="new-conv-form">
              <label className="form-label">
                Recipient ID
                <input
                  className="form-input"
                  type="text"
                  value={newRecipientId}
                  onChange={(e) => setNewRecipientId(e.target.value)}
                  placeholder="Paste exhibitor user ID…"
                  required
                />
                {newRecipientName && (
                  <span className="recipient-hint">📧 {newRecipientName}</span>
                )}
              </label>

              <label className="form-label">
                Subject
                <input
                  className="form-input"
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="What is this about?"
                  maxLength={200}
                  required
                />
              </label>

              {role === 'organizer' && (
                <label className="form-label">
                  Expo ID <span className="form-optional">(required for organizer)</span>
                  <input
                    className="form-input"
                    type="text"
                    value={newExpoId}
                    onChange={(e) => setNewExpoId(e.target.value)}
                    placeholder="Expo ID this conversation is about…"
                  />
                </label>
              )}

              <label className="form-label">
                Message
                <textarea
                  className="form-textarea"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={5}
                  maxLength={MAX_BODY}
                  required
                />
                <span className="char-counter">{newBody.length}/{MAX_BODY}</span>
              </label>

              {newError && <p className="form-error">⚠️ {newError}</p>}

              <div className="form-actions">
                <button type="submit" className="btn-send" disabled={newSending}>
                  {newSending ? 'Sending…' : 'Send Message'}
                </button>
                <button type="button" className="btn-cancel-form" onClick={() => setShowNewForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Thread view */}
        {!showNewForm && activeConvId && (
          <>
            {threadLoading ? (
              <div className="thread-loading"><div className="dashboard-spinner" /></div>
            ) : threadError ? (
              <div className="thread-error">⚠️ {threadError}</div>
            ) : (
              <>
                {/* Thread header */}
                <div className="thread-header">
                  <div>
                    <h3 className="thread-subject">{activeConv?.subject}</h3>
                    <p className="thread-participants">
                      {activeConv?.participants?.map((p) => p.name).join(' ↔ ')}
                    </p>
                  </div>
                  {activeConv?.relatedExpo && (
                    <span className="thread-expo-badge">📋 {activeConv.relatedExpo.title}</span>
                  )}
                </div>

                {/* Messages */}
                <div className="thread-messages">
                  {messages.length === 0 ? (
                    <div className="thread-empty">No messages yet.</div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender?._id === user?._id;
                      return (
                        <div
                          key={msg._id}
                          className={`message-bubble ${isMine ? 'message-mine' : 'message-theirs'}`}
                        >
                          <div className="message-meta">
                            <span className="message-sender">{msg.sender?.name || 'Unknown'}</span>
                            <span className="message-role-badge">{msg.sender?.role}</span>
                            <span className="message-time">{formatFull(msg.createdAt)}</span>
                          </div>
                          <p className="message-body">{msg.body}</p>
                          {isMine && (
                            <span className="message-read-status">
                              {msg.isRead ? '✓✓ Read' : '✓ Sent'}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply composer */}
                {activeConv?.status === 'open' && (
                  <form onSubmit={handleReply} className="reply-form">
                    <textarea
                      className="reply-textarea"
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Write a reply…"
                      rows={3}
                      maxLength={MAX_BODY}
                    />
                    <div className="reply-form-footer">
                      <span className="char-counter">{replyBody.length}/{MAX_BODY}</span>
                      {replyError && <span className="form-error">⚠️ {replyError}</span>}
                      <button type="submit" className="btn-send-reply" disabled={replySending}>
                        {replySending ? 'Sending…' : 'Send Reply ➤'}
                      </button>
                    </div>
                  </form>
                )}

                {activeConv?.status === 'closed' && (
                  <div className="thread-closed-banner">This conversation is closed.</div>
                )}
              </>
            )}
          </>
        )}

        {/* Empty state when nothing selected */}
        {!showNewForm && !activeConvId && (
          <div className="thread-placeholder">
            <div className="thread-placeholder-icon">✉️</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list, or start a new one.</p>
            <button className="btn-new-conv-cta" onClick={() => setShowNewForm(true)}>
              + New Message
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;
