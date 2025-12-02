import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import colors from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AttendanceTab, ScanTab, TimetableTab, ScoresTab } from './tabs';
import { CustomAlert } from '../components/ui';

const Tab = createBottomTabNavigator();

// Header component
function StudentHeader({ student, navigation, onLogout }) {
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
      <CustomAlert
        visible={showLogoutAlert}
        title="Logout"
        message="Are you sure you want to logout?"
        icon="logout"
        iconColor="#EF4444"
        buttons={[
          { text: 'Cancel', onPress: () => setShowLogoutAlert(false), style: 'cancel' },
          { text: 'Logout', onPress: onLogout, style: 'destructive' }
        ]}
        onClose={() => setShowLogoutAlert(false)}
      />
      
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 22, 
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: '#ffffff33',
          }}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: colors.textOnDarkSecondary }}>Welcome back</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textOnDark }}>
              {student?.name || 'Student'}
            </Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AboutDevelopers')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="information-outline" size={22} color={colors.textOnDark} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowLogoutAlert(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Student info card */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        gap: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: colors.textOnDarkSecondary }}>ROLL NO</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textOnDark }}>
            {student?.id || 'N/A'}
          </Text>
        </View>
        <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: colors.textOnDarkSecondary }}>BRANCH</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textOnDark }}>
            {student?.branch || 'N/A'}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textOnDark }}>2025-26</Text>
        </View>
      </View>
    </View>
  );
}

export default function StudentHomeScreen({ navigation }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('demo:studentAuth');
        if (!s) {
          navigation.replace('StudentLogin');
          return;
        }
        const j = JSON.parse(s);
        
        // Derive branch from roll number
        let branch = '';
        const rollNo = String(j.rollNo || '');
        if (rollNo.startsWith('25101')) branch = 'ECE';
        else if (rollNo.startsWith('25102')) branch = 'DSAI';
        else if (rollNo.startsWith('25100')) branch = 'CSE';
        
        setStudent({
          id: rollNo,
          name: j.name || 'Student',
          email: j.email || '',
          branch,
        });
      } catch (_) {
        navigation.replace('StudentLogin');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('demo:studentAuth');
    navigation.replace('Welcome');
  };

  if (loading || !student) {
    return (
      <LinearGradient 
        colors={[colors.bgDark, colors.bgDarkAlt]} 
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: colors.textOnDark }}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarkAlt]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <StudentHeader student={student} navigation={navigation} onLogout={handleLogout} />
        
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 0,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              paddingBottom: 0,
            },
            tabBarActiveTintColor: colors.bgDark,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginBottom: 8,
            },
            tabBarIconStyle: {
              marginTop: 8,
            },
          }}
        >
          <Tab.Screen
            name="AttendanceTab"
            options={{
              tabBarLabel: 'Attendance',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="clipboard-check" size={24} color={color} />
              ),
            }}
          >
            {(props) => <AttendanceTab {...props} student={student} />}
          </Tab.Screen>
          
          <Tab.Screen
            name="ScanTab"
            options={{
              tabBarLabel: 'Scan',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="qrcode-scan" size={24} color={color} />
              ),
            }}
          >
            {(props) => <ScanTab {...props} student={student} />}
          </Tab.Screen>
          
          <Tab.Screen
            name="TimetableTab"
            options={{
              tabBarLabel: 'Timetable',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="calendar-clock" size={24} color={color} />
              ),
            }}
          >
            {(props) => <TimetableTab {...props} student={student} />}
          </Tab.Screen>
          
          <Tab.Screen
            name="ScoresTab"
            options={{
              tabBarLabel: 'Scores',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="chart-bar" size={24} color={color} />
              ),
            }}
          >
            {(props) => <ScoresTab {...props} student={student} />}
          </Tab.Screen>
        </Tab.Navigator>
      </SafeAreaView>
    </LinearGradient>
  );
}
