import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AboutScreen = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Icon name="emergency" size={80} color="#4ECDC4" />
          </View>
          <Text style={styles.appName}>ResqYOU</Text>
          <Text style={styles.tagline}>Emergency Response & Locator System</Text>
          <Text style={styles.version}>Version 1.2.3</Text>
        </View>

        {/* Mission Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            ResqYOU is dedicated to saving lives by providing rapid, intelligent emergency response services.
            We leverage cutting-edge technology, including Dijkstra's Algorithm for optimal routing, to ensure
            help reaches those in need as quickly as possible.
          </Text>
          <Text style={styles.paragraph}>
            Every second counts in an emergency. Our mission is to bridge the gap between crisis and care,
            empowering individuals with a reliable safety net wherever they go.
          </Text>
        </View>

        {/* What We Do */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Do</Text>
          <Text style={styles.paragraph}>
            ResqYOU is an innovative emergency response and locator system that connects people in distress
            with nearby emergency responders through intelligent routing and real-time location tracking.
          </Text>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="emergency" size={24} color="#FF6B6B" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>One-Touch SOS</Text>
              <Text style={styles.featureDescription}>
                Instant emergency alert activation with automatic location sharing
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="location-on" size={24} color="#4ECDC4" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Real-Time Tracking</Text>
              <Text style={styles.featureDescription}>
                Continuous GPS tracking during emergencies with minute-by-minute updates
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="route" size={24} color="#51CF66" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Smart Routing</Text>
              <Text style={styles.featureDescription}>
                Dijkstra's Algorithm calculates the fastest path for emergency responders
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="history" size={24} color="#FFB84D" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Emergency History</Text>
              <Text style={styles.featureDescription}>
                Complete record of all SOS activations and resolutions
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="contacts" size={24} color="#9775FA" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Emergency Contacts</Text>
              <Text style={styles.featureDescription}>
                Automatic notification of designated contacts during emergencies
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Icon name="security" size={24} color="#FF6B6B" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Secure & Private</Text>
              <Text style={styles.featureDescription}>
                End-to-end encryption and privacy-focused location tracking
              </Text>
            </View>
          </View>
        </View>

        {/* Technology */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technology Behind ResqYOU</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Dijkstra's Algorithm:</Text> We use this proven graph theory algorithm
            to calculate the shortest and fastest path between emergency responders and incident locations.
            This mathematical approach ensures optimal routing in real-time.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>GPS Technology:</Text> High-precision GPS tracking provides accurate
            location data with meter-level accuracy, updating every minute during active emergencies.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Cloud Infrastructure:</Text> Scalable and reliable backend systems
            ensure 24/7 availability and instant alert processing.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Mobile-First Design:</Text> Native mobile applications for Android
            and iOS provide seamless emergency response on the go.
          </Text>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Activate SOS</Text>
              <Text style={styles.stepDescription}>
                Press and hold the SOS button in the app to trigger an emergency alert
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Location Sent</Text>
              <Text style={styles.stepDescription}>
                Your precise GPS coordinates are immediately transmitted to emergency services
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Route Calculated</Text>
              <Text style={styles.stepDescription}>
                Dijkstra's Algorithm determines the fastest path to your location
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Help Arrives</Text>
              <Text style={styles.stepDescription}>
                Emergency responders are dispatched and track your real-time location
              </Text>
            </View>
          </View>
        </View>

        {/* Our Commitment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Commitment</Text>
          <Text style={styles.paragraph}>
            ResqYOU is committed to continuous improvement and innovation in emergency response technology.
            We work closely with emergency services, first responders, and safety organizations to ensure
            our system meets the highest standards of reliability and effectiveness.
          </Text>
          <View style={styles.commitmentList}>
            <Text style={styles.commitmentItem}>✓ 24/7 System Availability</Text>
            <Text style={styles.commitmentItem}>✓ Regular Security Audits</Text>
            <Text style={styles.commitmentItem}>✓ Privacy-First Approach</Text>
            <Text style={styles.commitmentItem}>✓ Free for All Users</Text>
            <Text style={styles.commitmentItem}>✓ Continuous Feature Updates</Text>
            <Text style={styles.commitmentItem}>✓ Community Safety Focus</Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>By the Numbers</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Lives Protected</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Emergencies Resolved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>3 min</Text>
              <Text style={styles.statLabel}>Avg Response Time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>99.9%</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Text style={styles.paragraph}>
            We'd love to hear from you. Whether you have questions, feedback, or need support,
            our team is here to help.
          </Text>
          <Text style={styles.contactInfo}>Email: info@resqyou.com</Text>
          <Text style={styles.contactInfo}>Support: support@resqyou.com</Text>
          <Text style={styles.contactInfo}>Phone: +1 (555) 123-4567</Text>
          <Text style={styles.contactInfo}>Address: 123 Safety Blvd, Protection City</Text>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialButton}>
              <Icon name="facebook" size={24} color="#4267B2" />
              <Text style={styles.socialLabel}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Icon name="chat" size={24} color="#1DA1F2" />
              <Text style={styles.socialLabel}>Twitter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Icon name="photo-camera" size={24} color="#E4405F" />
              <Text style={styles.socialLabel}>Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 ResqYOU Emergency Services</Text>
          <Text style={styles.footerText}>All Rights Reserved</Text>
          <Text style={styles.footerText}>Made with ❤️ for safer communities</Text>
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
  },
  logoSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4ECDC420',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  version: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  paragraph: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commitmentList: {
    marginTop: 10,
  },
  commitmentItem: {
    fontSize: 14,
    color: '#51CF66',
    fontWeight: '500',
    marginBottom: 8,
  },
  statsSection: {
    backgroundColor: '#4ECDC4',
    padding: 20,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4ECDC4',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  contactInfo: {
    fontSize: 14,
    color: '#4ECDC4',
    marginBottom: 6,
  },
  socialSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  socialButton: {
    alignItems: 'center',
  },
  socialLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
});

export default AboutScreen;
