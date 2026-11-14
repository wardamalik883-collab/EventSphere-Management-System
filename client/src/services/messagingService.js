/**
 * messagingService.js — In-App Messaging API Service
 * Task 11: Conversation and message management endpoints.
 */

import api from './api';

/**
 * Start a new conversation or send to an existing one.
 * @param {object} data - { recipientId, subject, body, expoId? }
 */
export const startConversation = (data) =>
  api.post('/messages/conversations', data);

/**
 * List all conversations for the authenticated user.
 * @param {object} params - { page, limit }
 */
export const listConversations = (params = {}) =>
  api.get('/messages/conversations', { params });

/**
 * Get a single conversation with its message history.
 * @param {string} conversationId
 * @param {object} params - { page, limit }
 */
export const getConversation = (conversationId, params = {}) =>
  api.get(`/messages/conversations/${conversationId}`, { params });

/**
 * Send a reply to an existing conversation.
 * @param {string} conversationId
 * @param {object} data - { body }
 */
export const replyToConversation = (conversationId, data) =>
  api.post(`/messages/conversations/${conversationId}/reply`, data);

/**
 * Mark all unread messages in a conversation as read.
 * @param {string} conversationId
 */
export const markConversationRead = (conversationId) =>
  api.patch(`/messages/conversations/${conversationId}/read`);
