import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const TermsOfServiceScreen = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>


          <Text style={styles.intro}>
            Welcome to ResqYOU. By using our emergency response and locator system, you agree to comply with and
            be bound by the following terms and conditions. Please read them carefully.
          </Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using ResqYOU ("the Service"), you agree to be bound by these Terms of Service and all
            applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from
            using the Service.
          </Text>

          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.paragraph}>
            ResqYOU is an emergency response and locator system that:
          </Text>
          <Text style={styles.bulletPoint}>• Enables users to send SOS alerts with real-time location tracking</Text>
          <Text style={styles.bulletPoint}>• Routes emergency responders to incident locations using Dijkstra's Algorithm</Text>
          <Text style={styles.bulletPoint}>• Provides continuous location updates during active emergencies</Text>
          <Text style={styles.bulletPoint}>• Maintains historical records of emergency incidents</Text>
          <Text style={styles.bulletPoint}>• Facilitates communication between users and emergency responders</Text>

          <Text style={styles.sectionTitle}>3. User Eligibility</Text>
          <Text style={styles.paragraph}>
            You must be at least 13 years of age to use ResqYOU. By using the Service, you represent and warrant
            that you meet this age requirement and have the legal capacity to enter into these Terms of Service.
          </Text>

          <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
          <Text style={styles.paragraph}>As a user of ResqYOU, you agree to:</Text>
          <Text style={styles.bulletPoint}>• Provide accurate and complete information during registration</Text>
          <Text style={styles.bulletPoint}>• Keep your account credentials secure and confidential</Text>
          <Text style={styles.bulletPoint}>• Only activate SOS alerts during genuine emergencies</Text>
          <Text style={styles.bulletPoint}>• Grant location permissions for the app to function properly</Text>
          <Text style={styles.bulletPoint}>• Update your emergency contact information regularly</Text>
          <Text style={styles.bulletPoint}>• Not misuse the Service for false alarms or non-emergency purposes</Text>
          <Text style={styles.bulletPoint}>• Cooperate with emergency responders when assistance is dispatched</Text>

          <Text style={styles.sectionTitle}>5. Prohibited Conduct</Text>
          <Text style={styles.paragraph}>You must NOT:</Text>
          <Text style={styles.bulletPoint}>• Submit false emergency reports or hoax SOS alerts</Text>
          <Text style={styles.bulletPoint}>• Interfere with or disrupt the Service or servers</Text>
          <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to other accounts</Text>
          <Text style={styles.bulletPoint}>• Use the Service for any illegal or unauthorized purpose</Text>
          <Text style={styles.bulletPoint}>• Harass, threaten, or impersonate others</Text>
          <Text style={styles.bulletPoint}>• Tamper with location data or GPS coordinates</Text>
          <Text style={styles.bulletPoint}>• Reverse engineer or decompile any part of the Service</Text>

          <Text style={styles.sectionTitle}>6. Emergency Services Disclaimer</Text>
          <Text style={styles.warningBox}>
            <Icon name="warning" size={20} color={Colors.primary.main} />
            <Text style={styles.warningText}>
              {' '}IMPORTANT: ResqYOU is a supplementary emergency tool and should NOT replace traditional emergency
              services (911, 112, or local emergency numbers). In life-threatening situations, always contact local
              emergency services directly when possible.
            </Text>
          </Text>
          <Text style={styles.paragraph}>
            While ResqYOU aims to provide reliable emergency response coordination, we cannot guarantee:
          </Text>
          <Text style={styles.bulletPoint}>• Immediate response times in all situations</Text>
          <Text style={styles.bulletPoint}>• Uninterrupted or error-free service at all times</Text>
          <Text style={styles.bulletPoint}>• Availability during network outages or technical failures</Text>
          <Text style={styles.bulletPoint}>• GPS accuracy in all environments (buildings, tunnels, remote areas)</Text>

          <Text style={styles.sectionTitle}>7. Location Tracking and Privacy</Text>
          <Text style={styles.paragraph}>
            By using ResqYOU, you explicitly consent to:
          </Text>
          <Text style={styles.bulletPoint}>• Real-time location tracking during active SOS alerts</Text>
          <Text style={styles.bulletPoint}>• Sharing your location with authorized emergency responders</Text>
          <Text style={styles.bulletPoint}>• Storage of location history for safety auditing purposes</Text>
          <Text style={styles.bulletPoint}>• Background location access for continuous emergency monitoring</Text>
          <Text style={styles.paragraph}>
            Location tracking is ONLY active during emergencies. See our Privacy Policy for detailed information.
          </Text>

          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            TO THE FULLEST EXTENT PERMITTED BY LAW, ResqYOU and its affiliates, officers, employees, and agents
            SHALL NOT BE LIABLE for:
          </Text>
          <Text style={styles.bulletPoint}>• Any indirect, incidental, special, or consequential damages</Text>
          <Text style={styles.bulletPoint}>• Loss of life, injury, or property damage resulting from Service use</Text>
          <Text style={styles.bulletPoint}>• Delays or failures in emergency response</Text>
          <Text style={styles.bulletPoint}>• Inaccurate location data or routing information</Text>
          <Text style={styles.bulletPoint}>• Service interruptions, bugs, or technical errors</Text>
          <Text style={styles.bulletPoint}>• Actions or inactions of third-party emergency responders</Text>

          <Text style={styles.sectionTitle}>9. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify, defend, and hold harmless ResqYOU and its affiliates from any claims, damages,
            losses, liabilities, and expenses (including attorney fees) arising from:
          </Text>
          <Text style={styles.bulletPoint}>• Your use or misuse of the Service</Text>
          <Text style={styles.bulletPoint}>• Your violation of these Terms of Service</Text>
          <Text style={styles.bulletPoint}>• Your violation of any rights of another party</Text>
          <Text style={styles.bulletPoint}>• False emergency reports or fraudulent SOS alerts</Text>

          <Text style={styles.sectionTitle}>10. Account Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to suspend or terminate your account immediately, without prior notice, if:
          </Text>
          <Text style={styles.bulletPoint}>• You violate these Terms of Service</Text>
          <Text style={styles.bulletPoint}>• You submit false emergency reports</Text>
          <Text style={styles.bulletPoint}>• You engage in prohibited conduct</Text>
          <Text style={styles.bulletPoint}>• We are required to do so by law</Text>
          <Text style={styles.bulletPoint}>• The Service is discontinued</Text>
          <Text style={styles.paragraph}>
            You may delete your account at any time through the Settings menu.
          </Text>

          <Text style={styles.sectionTitle}>11. Service Availability</Text>
          <Text style={styles.paragraph}>
            ResqYOU is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not guarantee that
            the Service will be:
          </Text>
          <Text style={styles.bulletPoint}>• Available 24/7 without interruption</Text>
          <Text style={styles.bulletPoint}>• Free from errors, bugs, or viruses</Text>
          <Text style={styles.bulletPoint}>• Compatible with all devices or operating systems</Text>
          <Text style={styles.bulletPoint}>• Secure from unauthorized access or cyber attacks</Text>

          <Text style={styles.sectionTitle}>12. Algorithm Accuracy</Text>
          <Text style={styles.paragraph}>
            ResqYOU uses Dijkstra's Algorithm for optimal route calculation. While this algorithm is mathematically
            proven to find the shortest path, actual routing may be affected by:
          </Text>
          <Text style={styles.bulletPoint}>• Real-time traffic conditions</Text>
          <Text style={styles.bulletPoint}>• Road closures or construction</Text>
          <Text style={styles.bulletPoint}>• Map data accuracy and updates</Text>
          <Text style={styles.bulletPoint}>• Natural disasters or environmental hazards</Text>

          <Text style={styles.sectionTitle}>13. Data Backup</Text>
          <Text style={styles.paragraph}>
            While we maintain regular backups, you are responsible for maintaining your own records of critical
            information. We are not liable for any loss of data or inability to recover information.
          </Text>

          <Text style={styles.sectionTitle}>14. Modifications to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately
            upon posting. Your continued use of ResqYOU after changes indicates acceptance of the modified terms.
            We will notify you of significant changes via email or in-app notification.
          </Text>

          <Text style={styles.sectionTitle}>15. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms of Service are governed by and construed in accordance with applicable laws. Any disputes
            arising from these terms shall be resolved through binding arbitration or in the courts of the
            jurisdiction where ResqYOU is registered.
          </Text>

          <Text style={styles.sectionTitle}>16. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms of Service, please contact us:
          </Text>
          <Text style={styles.contactInfo}>Email: legal@resqyou.com</Text>
          <Text style={styles.contactInfo}>Phone: +1 (555) 123-4567</Text>
          <Text style={styles.contactInfo}>Address: ResqYOU Emergency Services, 123 Safety Blvd, Protection City</Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By clicking "I Agree" or using ResqYOU, you acknowledge that you have read, understood, and agree
              to be bound by these Terms of Service.
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
  section: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  intro: {
    fontSize: 15,
    color: Colors.neutral.gray700,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.neutral.gray600,
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: Colors.neutral.gray600,
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 10,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.background,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary.main,
    fontWeight: '500',
    lineHeight: 20,
  },
  contactInfo: {
    fontSize: 14,
    color: Colors.accent.action,
    lineHeight: 20,
    marginBottom: 6,
  },
  footer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent.action,
  },
  footerText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default TermsOfServiceScreen;
