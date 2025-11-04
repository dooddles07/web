import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE from '../config/api';

const MessagesScreen = ({ navigation }) => {
  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminData, setAdminData] = useState(null);

  const scrollViewRef = useRef(null);
  const pollingInterval = useRef(null);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    loadAdminData();
    fetchConversations();

    // Poll for new messages every 5 seconds
    pollingInterval.current = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation._id);
      }
    }, 5000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      markMessagesAsRead(selectedConversation._id);
    }
  }, [selectedConversation]);

  // ============================================
  // API CALLS
  // ============================================

  const loadAdminData = async () => {
    try {
      const data = await AsyncStorage.getItem('adminData');
      if (data) {
        setAdminData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        window.alert('Error: Authentication required');
        navigation.navigate('Auth');
        return;
      }

      const response = await axios.get(`${API_BASE}/api/messages/conversations/admin`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
      if (error.response?.status === 401) {
        window.alert('Error: Session expired. Please login again.');
        navigation.navigate('Auth');
      }
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        window.alert('Error: Authentication required');
        return;
      }

      console.log('Fetching messages for conversation:', conversationId);
      const response = await axios.get(
        `${API_BASE}/api/messages/conversation/${conversationId}?limit=100`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      console.log('Messages loaded successfully:', response.data.length);
      setChatMessages(response.data);

      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      if (error.response?.status === 401) {
        const errorMsg = error.response?.data?.message || 'Authentication failed';
        window.alert(`Error: ${errorMsg}. Please log out and log back in to refresh your session.`);
        // Optionally redirect to login
        // navigation.navigate('Auth');
      } else {
        window.alert('Error: Failed to load messages. Check console for details.');
      }
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      await axios.put(
        `${API_BASE}/api/messages/conversation/${conversationId}/read`,
        { readerType: 'admin' },
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // Update local conversation unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId
            ? { ...conv, unreadCountAdmin: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const assignToConversation = async (conversationId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      await axios.put(
        `${API_BASE}/api/messages/conversation/${conversationId}/assign`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      window.alert('Success: You have been assigned to this conversation');
      fetchConversations();
    } catch (error) {
      console.error('Error assigning to conversation:', error);
      window.alert('Error: Failed to assign to conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        window.alert('Error: Authentication required');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/messages/send`,
        {
          conversationId: selectedConversation._id,
          text: messageInput.trim(),
          senderType: 'admin',
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // Add new message to chat
      setChatMessages((prev) => [...prev, response.data]);
      setMessageInput('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      window.alert('Error: Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackPress = () => {
    navigation.goBack();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        item.unreadCountAdmin > 0 && styles.unreadItem,
        selectedConversation?._id === item._id && styles.selectedItem,
      ]}
      onPress={() => setSelectedConversation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(item.userName)}</Text>
        </View>
        {item.unreadCountAdmin > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCountAdmin}</Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <Text style={styles.conversationPreview} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
        {item.adminId && item.adminName && (
          <Text style={styles.assignedAdmin} numberOfLines={1}>
            Assigned to: {item.adminName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left Sidebar: Conversations List */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarTitleContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color="#4ECDC4" />
            </TouchableOpacity>
            <Text style={styles.sidebarTitle}>Messages</Text>
          </View>
          <Text style={styles.conversationCount}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chat-bubble-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Conversations will appear here when users send messages
              </Text>
            </View>
          }
        />
      </View>

      {/* Right: Chat Interface */}
      <View style={styles.chatContainer}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {getInitial(selectedConversation.userName)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.chatHeaderName}>
                    {selectedConversation.userName}
                  </Text>
                  <Text style={styles.chatHeaderStatus}>
                    {selectedConversation.status === 'active' ? 'Active' : 'Archived'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Messages Area */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesArea}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 ? (
                <View style={styles.emptyMessagesContainer}>
                  <Icon name="chat" size={48} color="#d1d5db" />
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>
                    Send a message to start the conversation
                  </Text>
                </View>
              ) : (
                chatMessages.map((message) => {
                  const isSentByAdmin = message.senderType === 'admin';
                  return (
                    <View
                      key={message._id}
                      style={[
                        styles.messageBubble,
                        isSentByAdmin ? styles.sentMessage : styles.receivedMessage,
                      ]}
                    >
                      {/* Image Message */}
                      {message.messageType === 'image' && message.mediaUrl && (
                        <Image
                          source={{ uri: message.mediaUrl }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                      )}

                      {/* Video Message */}
                      {message.messageType === 'video' && (
                        <View style={styles.videoContainer}>
                          {message.thumbnailUrl ? (
                            <Image
                              source={{ uri: message.thumbnailUrl }}
                              style={styles.messageImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.messageImage, styles.videoPlaceholder]}>
                              <Icon name="videocam" size={48} color="#fff" />
                            </View>
                          )}
                          <View style={styles.videoOverlay}>
                            <Icon name="play-circle" size={48} color="#fff" />
                          </View>
                          {message.mediaDuration && (
                            <View style={styles.durationBadge}>
                              <Text style={styles.durationText}>
                                {formatDuration(message.mediaDuration)}
                              </Text>
                            </View>
                          )}
                          {message.mediaUrl && (
                            <TouchableOpacity
                              style={styles.mediaLink}
                              onPress={() => window.open(message.mediaUrl, '_blank')}
                            >
                              <Icon name="open-in-new" size={16} color="#4ECDC4" />
                              <Text style={styles.mediaLinkText}>Open video</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Audio Message */}
                      {message.messageType === 'audio' && (
                        <View style={styles.audioContainer}>
                          <Icon name="mic" size={24} color={isSentByAdmin ? "#fff" : "#4ECDC4"} />
                          <View style={styles.audioInfo}>
                            <Text style={[styles.audioLabel, isSentByAdmin && styles.sentMessageText]}>
                              Voice message
                            </Text>
                            {message.mediaDuration && (
                              <Text style={[styles.audioDuration, isSentByAdmin && styles.sentMessageText]}>
                                {formatDuration(message.mediaDuration)}
                              </Text>
                            )}
                          </View>
                          {message.mediaUrl && (
                            <TouchableOpacity
                              onPress={() => window.open(message.mediaUrl, '_blank')}
                              style={styles.audioPlayButton}
                            >
                              <Icon name="play-arrow" size={20} color={isSentByAdmin ? "#fff" : "#4ECDC4"} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Text (caption for media or standalone text) */}
                      {message.text && (
                        <Text
                          style={[
                            styles.messageText,
                            isSentByAdmin && styles.sentMessageText,
                            message.messageType !== 'text' && styles.captionText,
                          ]}
                        >
                          {message.text}
                        </Text>
                      )}

                      <Text
                        style={[
                          styles.messageTime,
                          isSentByAdmin && styles.sentMessageTime,
                        ]}
                      >
                        {formatMessageTime(message.createdAt)}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
                value={messageInput}
                onChangeText={setMessageInput}
                editable={!sending}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!messageInput.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!messageInput.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.noChatSelected}>
            <Icon name="forum" size={64} color="#d1d5db" />
            <Text style={styles.noChatSelectedText}>Select a conversation</Text>
            <Text style={styles.noChatSelectedSubtext}>
              Choose a conversation from the list to start messaging
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },

  // Sidebar Styles
  sidebar: {
    width: 360,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sidebarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  conversationCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 44,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#111827',
    outlineStyle: 'none',
  },

  // Conversation Item Styles
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  unreadItem: {
    backgroundColor: '#f0fdf4',
  },
  selectedItem: {
    backgroundColor: '#e0f2f1',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  conversationTime: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 8,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#6b7280',
  },
  assignedAdmin: {
    fontSize: 12,
    color: '#4ECDC4',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // Chat Container Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  chatHeaderStatus: {
    fontSize: 13,
    color: '#6b7280',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#e0f2f1',
    borderRadius: 8,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4ECDC4',
    marginLeft: 6,
  },

  // Messages Area
  messagesArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messagesContent: {
    padding: 20,
    flexGrow: 1,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4ECDC4',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  sentMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  captionText: {
    marginTop: 8,
  },

  // Multimedia Message Styles
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoContainer: {
    position: 'relative',
  },
  videoPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  mediaLinkText: {
    color: '#4ECDC4',
    fontSize: 13,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minWidth: 200,
  },
  audioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  audioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  audioDuration: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  audioPlayButton: {
    marginLeft: 12,
  },

  // Input Area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    outlineStyle: 'none',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },

  // No Chat Selected
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 40,
  },
  noChatSelectedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 20,
    marginBottom: 8,
  },
  noChatSelectedSubtext: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default MessagesScreen;
