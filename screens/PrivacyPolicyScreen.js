import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

          <Text style={styles.intro}>
            ResqYOU is committed to protecting your privacy and ensuring the security of your personal information.
            This Privacy Policy explains how we collect, use, and safeguard your data when you use our emergency
            response and locator system.
          </Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Location Data:</Text> When you activate an SOS alert, we collect and continuously
            track your real-time GPS location to provide accurate emergency response. Location data is essential for
            routing emergency responders to your exact position using our Dijkstra's Algorithm-based navigation system.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Personal Information:</Text> We collect your name, email address, username, phone
            number, and emergency contact information during registration to facilitate emergency response coordination.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Device Information:</Text> We collect device type, operating system, and unique
            device identifiers to ensure optimal app performance and security.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>SOS History:</Text> We maintain records of your SOS activations, including timestamps,
            locations, and resolution status for safety auditing and service improvement.
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.bulletPoint}>• Emergency Response: Provide your real-time location to emergency responders</Text>
          <Text style={styles.bulletPoint}>• Route Optimization: Calculate the fastest route to your location using Dijkstra's Algorithm</Text>
          <Text style={styles.bulletPoint}>• Safety Monitoring: Track location updates during active emergencies</Text>
          <Text style={styles.bulletPoint}>• Service Improvement: Analyze response times and system performance</Text>
          <Text style={styles.bulletPoint}>• Communication: Send emergency alerts and system notifications</Text>
          <Text style={styles.bulletPoint}>• Account Management: Authenticate users and maintain account security</Text>

          <Text style={styles.sectionTitle}>3. Location Tracking</Text>
          <Text style={styles.paragraph}>
            Location tracking is activated ONLY when you trigger an SOS alert. We continuously update your location
            every minute during an active emergency to ensure responders can find you even if you're moving. Location
            tracking automatically stops when:
          </Text>
          <Text style={styles.bulletPoint}>• You manually cancel the SOS alert</Text>
          <Text style={styles.bulletPoint}>• An emergency responder marks your emergency as resolved</Text>
          <Text style={styles.bulletPoint}>• The system times out after extended inactivity</Text>

          <Text style={styles.sectionTitle}>4. Data Sharing and Disclosure</Text>
          <Text style={styles.paragraph}>
            We share your information ONLY in the following circumstances:
          </Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Emergency Services:</Text> Your location and profile are shared with authorized emergency responders during active SOS alerts</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Legal Requirements:</Text> We may disclose information when required by law or to protect public safety</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Service Providers:</Text> Trusted third-party services that help us operate the platform (e.g., mapping services, cloud storage)</Text>
          <Text style={styles.paragraph}>
            We DO NOT sell, rent, or trade your personal information to third parties for marketing purposes.
          </Text>

          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures to protect your data:
          </Text>
          <Text style={styles.bulletPoint}>• End-to-end encryption for sensitive data transmission</Text>
          <Text style={styles.bulletPoint}>• Secure JWT token-based authentication</Text>
          <Text style={styles.bulletPoint}>• Encrypted password storage using bcrypt hashing</Text>
          <Text style={styles.bulletPoint}>• Regular security audits and vulnerability assessments</Text>
          <Text style={styles.bulletPoint}>• Access controls limiting data access to authorized personnel only</Text>

          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data for the following periods:
          </Text>
          <Text style={styles.bulletPoint}>• Active SOS alerts: Retained for 24 months after resolution</Text>
          <Text style={styles.bulletPoint}>• Account information: Retained while your account is active</Text>
          <Text style={styles.bulletPoint}>• Location history: Stored for 12 months for safety auditing</Text>
          <Text style={styles.bulletPoint}>• Deleted accounts: Personal data is permanently removed within 30 days</Text>

          <Text style={styles.sectionTitle}>7. Your Rights</Text>
          <Text style={styles.paragraph}>You have the right to:</Text>
          <Text style={styles.bulletPoint}>• Access your personal data and SOS history</Text>
          <Text style={styles.bulletPoint}>• Update or correct your profile information</Text>
          <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
          <Text style={styles.bulletPoint}>• Opt-out of non-emergency notifications</Text>
          <Text style={styles.bulletPoint}>• Request a copy of your data in a portable format</Text>
          <Text style={styles.bulletPoint}>• Withdraw consent for data processing (except during active emergencies)</Text>

          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            ResqYOU is not intended for children under 13 years of age. We do not knowingly collect personal
            information from children. If you believe a child has provided us with personal information, please
            contact us immediately.
          </Text>

          <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy to reflect changes in our practices or legal requirements. We will
            notify you of significant changes via email or in-app notification. Continued use of ResqYOU after
            changes indicates acceptance of the updated policy.
          </Text>

          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us:
          </Text>
          <Text style={styles.contactInfo}>Email: privacy@resqyou.com</Text>
          <Text style={styles.contactInfo}>Phone: +1 (555) 123-4567</Text>
          <Text style={styles.contactInfo}>Address: ResqYOU Emergency Services, 123 Safety Blvd, Protection City</Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using ResqYOU, you acknowledge that you have read and understood this Privacy Policy
              and agree to the collection and use of information as described herein.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  intro: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  bulletPoint: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 10,
  },
  contactInfo: {
    fontSize: 14,
    color: '#4ECDC4',
    lineHeight: 20,
    marginBottom: 6,
  },
  footer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default PrivacyPolicyScreen;
