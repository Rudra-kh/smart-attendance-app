import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import BranchSelectionScreen from './src/screens/BranchSelectionScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import QRSessionScreen from './src/screens/QRSessionScreen';
import SessionResultsScreen from './src/screens/SessionResultsScreen';
import StudentDemoScreen from './src/screens/StudentDemoScreen';
import StudentLoginScreen from './src/screens/StudentLoginScreen';
import StudentHomeScreen from './src/screens/StudentHomeScreen';
import StudentPanelScreen from './src/screens/StudentPanelScreen';
import MyAttendanceScreen from './src/screens/MyAttendanceScreen';
import SubjectAttendanceScreen from './src/screens/SubjectAttendanceScreen';
import AboutDevelopersScreen from './src/screens/AboutDevelopersScreen';
import MyScoresScreen from './src/screens/MyScoresScreen';
import UploadScoresScreen from './src/screens/UploadScoresScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="BranchSelection" component={BranchSelectionScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="QRSession" component={QRSessionScreen} />
        <Stack.Screen name="SessionResults" component={SessionResultsScreen} />
        <Stack.Screen name="StudentDemo" component={StudentDemoScreen} />
        <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
        <Stack.Screen name="StudentPanel" component={StudentPanelScreen} />
        <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
        <Stack.Screen name="AboutDevelopers" component={AboutDevelopersScreen} />
        <Stack.Screen name="MyScores" component={MyScoresScreen} />
        <Stack.Screen name="UploadScores" component={UploadScoresScreen} />
        <Stack.Screen
          name="MyAttendance"
          component={MyAttendanceScreen}
          options={{ headerShown: true, headerTitle: 'My Attendance' }}
        />
        <Stack.Screen
          name="SubjectAttendance"
          component={SubjectAttendanceScreen}
          options={{ headerShown: true, headerTitle: 'Subject Attendance' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
