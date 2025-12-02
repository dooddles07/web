import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const HelpCenterScreen = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const faqs = [
    {
      question: 'How do I activate an SOS alert?',
      answer: 'To activate an SOS alert:\n\n1. Open the ResqYOU app on your mobile device\n2. Press and hold the large red SOS button on the home screen\n3. Confirm the alert when prompted\n4. Your current location will be immediately sent to emergency responders\n5. Location tracking will continue automatically until help arrives\n\nIMPORTANT: Only use the SOS feature during genuine emergencies.'
    },
    {
      question: 'How does location tracking work?',
      answer: 'ResqYOU uses GPS technology to track your location:\n\n• Location tracking ONLY activates during an active SOS alert\n• Your location updates every minute automatically\n• Responders see your real-time position on their map\n• The system uses Dijkstra\'s Algorithm to calculate the fastest route to you\n• Tracking stops when you cancel the alert or when responders mark it as resolved\n\nFor accurate tracking, ensure:\n• Location services are enabled for ResqYOU\n• You have a clear view of the sky (GPS works best outdoors)\n• Your device has sufficient battery'
    },
    {
      question: 'Can I cancel an SOS alert?',
      answer: 'Yes, you can cancel an SOS alert if it was activated by mistake:\n\n1. Open the ResqYOU app\n2. Tap the "Cancel SOS" button on the home screen\n3. Confirm the cancellation\n4. Location tracking will stop immediately\n\nNote: If emergency responders have already been dispatched, they may still contact you to verify the cancellation.'
    },
    {
      question: 'What if I\'m in an area with no internet connection?',
      answer: 'ResqYOU is designed to work with minimal connectivity:\n\n• SOS alerts can be sent using basic cellular data\n• GPS tracking works without internet (uses satellite signals)\n• The app stores your last known location\n• Alerts will be queued and sent when connection is restored\n\nFor best results:\n• Keep your device charged\n• Enable cellular data for ResqYOU\n• Download offline maps for your area (coming soon)'
    },
    {
      question: 'How accurate is the location tracking?',
      answer: 'Location accuracy depends on several factors:\n\n• Outdoor areas: Typically 5-10 meters accurate\n• Urban areas: 10-20 meters (buildings may interfere)\n• Indoor locations: 20-50 meters (GPS signal weakened)\n• Remote areas: Varies based on satellite visibility\n\nThe app displays your location accuracy in meters. Responders see this information to assess precision.'
    },
    {
      question: 'What is Dijkstra\'s Algorithm and how does it help?',
      answer: 'Dijkstra\'s Algorithm is a mathematical method for finding the shortest path:\n\n• It calculates the fastest route from responders to your location\n• Considers all available roads and pathways\n• Optimizes for minimum travel time\n• Updates dynamically if you\'re moving\n\nThis ensures emergency responders reach you as quickly as possible using the most efficient route.'
    },
    {
      question: 'Can I add emergency contacts?',
      answer: 'Yes, you can manage emergency contacts:\n\n1. Go to Settings > Emergency Contacts\n2. Tap "Add Contact"\n3. Enter their name and phone number\n4. Save the contact\n\nEmergency contacts will be notified automatically when you activate an SOS alert. They can view your location and status updates.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'To update your profile:\n\n1. Go to Settings > Edit Profile\n2. Update your information (name, email, phone number)\n3. Tap "Save Changes"\n\nKeep your information current to ensure responders can contact you properly.'
    },
    {
      question: 'What happens when I trigger an SOS?',
      answer: 'When you activate an SOS alert:\n\n1. Your location is immediately sent to the emergency response center\n2. Nearby emergency responders are notified\n3. The system calculates the optimal route to your location\n4. Your location updates every minute automatically\n5. Emergency contacts receive a notification\n6. You can see estimated arrival time of responders\n7. A direct communication line is established\n\nStay calm and keep your device with you.'
    },
    {
      question: 'How do I change my password?',
      answer: 'To change your password:\n\n1. Go to Settings > Change Password\n2. Enter your current password\n3. Enter your new password\n4. Confirm your new password\n5. Tap "Change Password"\n\nYour password must be at least 6 characters long for security.'
    },
    {
      question: 'Can I view my SOS history?',
      answer: 'Yes, you can view all past SOS alerts:\n\n1. Go to the Dashboard/History section\n2. View list of all your SOS activations\n3. See details: date, time, location, resolution status\n4. Filter by status (active, resolved, cancelled)\n\nThis history helps you track safety incidents and review past emergencies.'
    },
    {
      question: 'What should I do if the app is not working?',
      answer: 'Troubleshooting steps:\n\n1. Check your internet connection\n2. Verify location services are enabled\n3. Ensure the app has required permissions\n4. Restart the app\n5. Update to the latest version\n6. Restart your device\n7. Reinstall the app if issues persist\n\nIf problems continue, contact support at support@resqyou.com\n\nIMPORTANT: In a real emergency, always call traditional emergency services (911) if the app is not working.'
    },
    {
      question: 'How is my privacy protected?',
      answer: 'ResqYOU takes your privacy seriously:\n\n• Location is ONLY tracked during active SOS alerts\n• Data is encrypted during transmission\n• Your information is not sold to third parties\n• You can delete your account and data at any time\n• Only authorized responders can see your location during emergencies\n\nRead our full Privacy Policy for details.'
    },
    {
      question: 'Is ResqYOU free to use?',
      answer: 'Yes, ResqYOU is completely free for all users:\n\n• No subscription fees\n• No hidden charges\n• All emergency features included\n• Unlimited SOS activations\n\nOur mission is to make emergency response accessible to everyone.'
    },
    {
      question: 'What devices are supported?',
      answer: 'ResqYOU is available on:\n\n• Android 8.0 and above\n• iOS 12.0 and above\n• Web platform (for administrators)\n\nRequirements:\n• GPS-enabled device\n• Internet or cellular data connection\n• Location permissions granted'
    }
  ];

  const toggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Go back to Settings"
          accessibilityRole="button"
          accessibilityHint="Returns to the Settings screen"
        >
          <Icon name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Icon name="help-outline" size={48} color={Colors.secondary.orange} />
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeText}>
            Find answers to common questions about ResqYOU Emergency Response System
          </Text>
        </View>

        <View style={styles.emergencyCard}>
          <Icon name="warning" size={24} color={Colors.primary.red} />
          <View style={styles.emergencyTextContainer}>
            <Text style={styles.emergencyTitle}>In Case of Emergency</Text>
            <Text style={styles.emergencyText}>
              If you need immediate help, press the SOS button in the app or call your local emergency number (911).
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {faqs.map((faq, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.faqItem,
              Platform.OS === 'web' && hoveredIndex === index && styles.faqItemHover
            ]}
            onPress={() => toggleFAQ(index)}
            onMouseEnter={() => Platform.OS === 'web' && setHoveredIndex(index)}
            onMouseLeave={() => Platform.OS === 'web' && setHoveredIndex(null)}
            activeOpacity={0.7}
            accessibilityLabel={faq.question}
            accessibilityRole="button"
            accessibilityHint={expandedIndex === index ? "Collapse answer" : "Expand to view answer"}
            accessibilityState={{ expanded: expandedIndex === index }}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Icon
                name={expandedIndex === index ? 'expand-less' : 'expand-more'}
                size={24}
                color={Colors.secondary.orange}
              />
            </View>
            {expandedIndex === index && (
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            Our support team is here to assist you 24/7
          </Text>

          <View style={styles.contactMethods}>
            <View style={styles.contactMethod}>
              <Icon name="email" size={24} color={Colors.secondary.orange} />
              <Text style={styles.contactMethodLabel}>Email Support</Text>
              <Text style={styles.contactMethodValue}>support@resqyou.com</Text>
            </View>

            <View style={styles.contactMethod}>
              <Icon name="phone" size={24} color={Colors.secondary.orange} />
              <Text style={styles.contactMethodLabel}>Phone Support</Text>
              <Text style={styles.contactMethodValue}>+1 (555) 123-4567</Text>
            </View>

            <View style={styles.contactMethod}>
              <Icon name="chat" size={24} color={Colors.secondary.orange} />
              <Text style={styles.contactMethodLabel}>Live Chat</Text>
              <Text style={styles.contactMethodValue}>Available 24/7 in app</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ResqYOU - Keeping You Safe</Text>
          <Text style={styles.footerText}>Version 1.2.3</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 2,
      shadowColor: Colors.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 15,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.red,
  },
  emergencyTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.red,
    marginBottom: 5,
  },
  emergencyText: {
    fontSize: 14,
    color: Colors.primary.red,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 15,
  },
  faqItem: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
  },
  faqItemHover: {
    backgroundColor: Colors.neutral.gray50,
    transform: [{ scale: 1.01 }],
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.neutral.gray600,
    lineHeight: 20,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  contactSection: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  contactMethods: {
    gap: 15,
  },
  contactMethod: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: 8,
  },
  contactMethodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginTop: 10,
    marginBottom: 5,
  },
  contactMethodValue: {
    fontSize: 14,
    color: Colors.secondary.orange,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.neutral.gray400,
    marginBottom: 5,
  },
});

export default HelpCenterScreen;
