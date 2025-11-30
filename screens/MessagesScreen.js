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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE from '../config/api';

const MessagesScreen = ({ navigation, route }) => {
  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminData, setAdminData] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [hoveredButton, setHoveredButton] = useState(null);
  const [imageModal, setImageModal] = useState({ visible: false, url: '' });

  const scrollViewRef = useRef(null);
  const pollingInterval = useRef(null);

  // Function to stop all playing media
  const stopAllMedia = () => {
    // Stop all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    // Stop all video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
  };

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

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
      stopAllMedia();
    };
  }, []);

  useEffect(() => {
    // Stop all media when conversation changes
    stopAllMedia();

    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      markMessagesAsRead(selectedConversation._id);
    }
  }, [selectedConversation]);

  // Handle navigation params from dashboard (auto-select conversation)
  useEffect(() => {
    if (route?.params?.username && conversations.length > 0) {
      const targetUsername = route.params.username;
      const conversation = conversations.find(
        conv => conv.userName === targetUsername || conv.userId?.username === targetUsername
      );
      if (conversation) {
        setSelectedConversation(conversation);
        const displayName = getDisplayName(conversation);
        showToast(`Opened conversation with ${displayName}`, 'success');
      }
    }
  }, [conversations, route?.params]);

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
        console.error('No auth token found in Messages screen');
        showToast('Please log in to view messages', 'error');

        // For web, redirect to login page
        setTimeout(() => {
          if (Platform.OS === 'web') {
            window.location.href = '/login';
          }
        }, 1500);
        return;
      }

      const response = await axios.get(`${API_BASE}/api/messages/conversations/admin`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Handle nested data structure - conversations may be in response.data.data
      const conversationsData = response.data.data || response.data;

      // Ensure it's an array
      const conversationsArray = Array.isArray(conversationsData) ? conversationsData : [];

      setConversations(conversationsArray);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
          if (Platform.OS === 'web') {
            window.location.href = '/login';
          }
        }, 1500);
      } else {
        showToast('Failed to load conversations', 'error');
      }
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/api/messages/conversation/${conversationId}?limit=100`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // Handle nested data structure - messages may be in response.data.data
      const messagesData = response.data.data || response.data;

      // Ensure it's an array
      const messagesArray = Array.isArray(messagesData) ? messagesData : [];

      setChatMessages(messagesArray);

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
        showToast(`${errorMsg}. Please log out and log back in.`, 'error');
        // Optionally redirect to login
        // navigation.navigate('Auth');
      } else {
        showToast('Failed to load messages. Please try again.', 'error');
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

      showToast('You have been assigned to this conversation', 'success');
      fetchConversations();
    } catch (error) {
      console.error('Error assigning to conversation:', error);
      showToast('Failed to assign to conversation', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast('Authentication required', 'error');
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
      showToast('Failed to send message', 'error');
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

  // Helper to get display name from conversation
  const getDisplayName = (conversation) => {
    // Try multiple possible paths for fullname
    const fullname =
      conversation.userId?.fullname ||
      conversation.userId?.fullName ||
      conversation.userFullname ||
      conversation.fullname ||
      conversation.userName ||
      conversation.username ||
      'Unknown User';

    return fullname;
  };

  // Helper to get avatar URL from conversation
  const getAvatarUrl = (conversation) => {
    // Check multiple possible avatar paths
    const avatar =
      conversation.userId?.avatar ||
      conversation.userId?.profilePicture ||
      conversation.userId?.profilePic ||
      conversation.userAvatar ||
      conversation.avatar ||
      null;

    return avatar;
  };

  // Ensure conversations is an array before filtering
  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter((conv) => {
        const displayName = getDisplayName(conv);
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  const handleBackPress = () => {
    stopAllMedia();
    navigation.goBack();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderConversationItem = ({ item }) => {
    // Get display name and avatar using helper functions
    const displayName = getDisplayName(item);
    const userAvatar = getAvatarUrl(item);

    return (
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
          {userAvatar ? (
            <Image
              source={{ uri: userAvatar }}
              style={styles.avatar}
              {...(Platform.OS === 'web' && {
                referrerPolicy: 'no-referrer',
                crossOrigin: 'anonymous',
              })}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getInitial(displayName)}</Text>
            </View>
          )}
          {item.unreadCountAdmin > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCountAdmin}</Text>
            </View>
          )}
        </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {displayName}
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
};

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toast.visible && (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <Icon
            name={toast.type === 'success' ? 'check-circle' : 'error'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Left Sidebar: Conversations List */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarTitleContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
              accessibilityLabel="Go back to previous screen"
              accessibilityRole="button"
            >
              <Icon name="arrow-back" size={24} color="#14b8a6" />
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
                {getAvatarUrl(selectedConversation) ? (
                  <Image
                    source={{ uri: getAvatarUrl(selectedConversation) }}
                    style={styles.chatAvatar}
                    {...(Platform.OS === 'web' && {
                      referrerPolicy: 'no-referrer',
                      crossOrigin: 'anonymous',
                    })}
                  />
                ) : (
                  <View style={[styles.chatAvatar, styles.chatAvatarPlaceholder]}>
                    <Text style={styles.chatAvatarText}>
                      {getInitial(getDisplayName(selectedConversation))}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.chatHeaderName}>
                    {getDisplayName(selectedConversation)}
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
              {!Array.isArray(chatMessages) || chatMessages.length === 0 ? (
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
                        <TouchableOpacity
                          onPress={() => setImageModal({ visible: true, url: message.mediaUrl })}
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{ uri: message.mediaUrl }}
                            style={styles.messageImage}
                            resizeMode="cover"
                            {...(Platform.OS === 'web' && {
                              referrerPolicy: 'no-referrer',
                              crossOrigin: 'anonymous',
                            })}
                          />
                          <View style={styles.imageOverlay}>
                            <Icon name="zoom-in" size={24} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* Video Message */}
                      {message.messageType === 'video' && message.mediaUrl && (
                        <View style={styles.videoContainer}>
                          <video
                            controls
                            style={{
                              width: '100%',
                              maxWidth: 350,
                              height: 'auto',
                              borderRadius: 12,
                              outline: 'none',
                            }}
                            preload="metadata"
                          >
                            <source src={message.mediaUrl} type="video/mp4" />
                            <source src={message.mediaUrl} type="video/webm" />
                            Your browser does not support the video element.
                          </video>
                          {message.mediaDuration && (
                            <View style={styles.durationBadge}>
                              <Text style={styles.durationText}>
                                {formatDuration(message.mediaDuration)}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Audio Message */}
                      {message.messageType === 'audio' && message.mediaUrl && (
                        <View style={styles.audioContainer}>
                          <Icon name="mic" size={24} color={isSentByAdmin ? "#fff" : "#14b8a6"} />
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
                          <audio
                            controls
                            style={{
                              height: 32,
                              maxWidth: 180,
                              outline: 'none',
                            }}
                            preload="metadata"
                          >
                            <source src={message.mediaUrl} type="audio/m4a" />
                            <source src={message.mediaUrl} type="audio/mp4" />
                            <source src={message.mediaUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
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

      {/* Image Modal */}
      {imageModal.visible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setImageModal({ visible: false, url: '' })}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setImageModal({ visible: false, url: '' })}
              >
                <Icon name="close" size={30} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: imageModal.url }}
                style={styles.modalImage}
                resizeMode="contain"
                {...(Platform.OS === 'web' && {
                  referrerPolicy: 'no-referrer',
                  crossOrigin: 'anonymous',
                })}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: '#14b8a6', // Mobile primary teal
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
    color: '#14b8a6', // Mobile primary teal
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
    backgroundColor: '#14b8a6', // Mobile primary teal
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
    backgroundColor: '#f0fdfa', // Mobile teal background light
    borderRadius: 8,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600', // Consistent weight
    color: '#14b8a6', // Mobile primary teal
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
    backgroundColor: '#14b8a6', // Mobile primary teal
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    }),
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
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  videoContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minWidth: 250,
    gap: 8,
  },
  audioInfo: {
    flex: 1,
    marginLeft: 4,
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
    backgroundColor: '#14b8a6', // Mobile primary teal
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
  // Toast notification styles
  toast: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 8,
    }),
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#10b981', // Mobile green
  },
  toastError: {
    backgroundColor: '#ef4444', // Mobile red
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },

  // Image Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  modalCloseArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10001,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
});

export default MessagesScreen;
