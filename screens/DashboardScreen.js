import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalIncidents: 245,
    activeIncidents: 12,
    resolvedIncidents: 233,
    criticalIncidents: 3
  });

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [20, 45, 28, 80, 99, 43],
      strokeWidth: 2,
      color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`
    }]
  };

  const pieData = [
    { name: 'Domestic Violence', population: 45, color: '#FF6B6B', legendFontColor: '#7F7F7F' },
    { name: 'Sexual Harassment', population: 25, color: '#4ECDC4', legendFontColor: '#7F7F7F' },
    { name: 'Physical Abuse', population: 20, color: '#45B7D1', legendFontColor: '#7F7F7F' },
    { name: 'Others', population: 10, color: '#FFA07A', legendFontColor: '#7F7F7F' }
  ];

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statCardContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => navigation.openDrawer()}
        >
          <Icon name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="notifications" size={24} color="#333" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Alert */}
        <View style={styles.emergencyAlert}>
          <Icon name="warning" size={20} color="#FF4757" />
          <Text style={styles.emergencyText}>
            {stats.criticalIncidents} Critical incidents require immediate attention
          </Text>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Incidents"
            value={stats.totalIncidents}
            icon="bar-chart"
            color="#4ECDC4"
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            title="Active Cases"
            value={stats.activeIncidents}
            icon="pending-actions"
            color="#FF6B6B"
            onPress={() => navigation.navigate('Navigation')}
          />
          <StatCard
            title="Resolved Cases"
            value={stats.resolvedIncidents}
            icon="check-circle"
            color="#2ECC71"
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            title="Critical Cases"
            value={stats.criticalIncidents}
            icon="priority-high"
            color="#FF4757"
            onPress={() => navigation.navigate('Navigation')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <QuickAction
              title="Report Incident"
              icon="add-circle"
              color="#FF6B6B"
              onPress={() => navigation.navigate('ReportIncident')}
            />
            <QuickAction
              title="View Map"
              icon="map"
              color="#4ECDC4"
              onPress={() => navigation.navigate('Navigation')}
            />
            <QuickAction
              title="Messages"
              icon="message"
              color="#45B7D1"
              onPress={() => navigation.navigate('Messages')}
            />
            <QuickAction
              title="Settings"
              icon="settings"
              color="#9B59B6"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        {/* Incident Trends Chart */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Incident Trends (Last 6 Months)</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#FF6B6B'
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* Incident Types Distribution */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Incident Types Distribution</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              width={width - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activitiesList}>
            {[
              { title: 'New incident reported in Zone 4', time: '2 hours ago', type: 'report' },
              { title: 'Case #2024-156 marked as resolved', time: '4 hours ago', type: 'resolved' },
              { title: 'Emergency alert sent to Zone 2', time: '6 hours ago', type: 'alert' },
              { title: 'Monthly report generated', time: '1 day ago', type: 'report' }
            ].map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityIcon, { 
                  backgroundColor: activity.type === 'report' ? '#FF6B6B20' : 
                                  activity.type === 'resolved' ? '#2ECC7120' :
                                  activity.type === 'alert' ? '#FF475720' : '#4ECDC420'
                }]}>
                  <Icon 
                    name={activity.type === 'report' ? 'report' : 
                          activity.type === 'resolved' ? 'check-circle' :
                          activity.type === 'alert' ? 'warning' : 'description'} 
                    size={16} 
                    color={activity.type === 'report' ? '#FF6B6B' : 
                           activity.type === 'resolved' ? '#2ECC71' :
                           activity.type === 'alert' ? '#FF4757' : '#4ECDC4'} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))}
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
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emergencyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
    marginBottom: 20,
  },
  emergencyText: {
    flex: 1,
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  viewButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    width: '22%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chart: {
    borderRadius: 16,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  chartPlaceholderSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  pieChartContainer: {
    padding: 20,
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pieColorBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  pieLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activitiesList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
});

export default DashboardScreen;