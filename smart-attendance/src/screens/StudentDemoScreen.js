import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import colors from '../theme/colors';
import { getSession, submitAttendance } from '../lib/attendance';
import languageGroups from '../data/languageGroups.json';
import Constants from 'expo-constants';
// Lazy-load barcode scanner to avoid native module errors when unavailable
let LoadedBarCodeScanner = null;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';

export default function StudentDemoScreen({ navigation }) {
  const [sessionId, setSessionId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false); // closed by default; user opens explicitly
  const [scanned, setScanned] = useState(false);
  const extras = Constants?.expoConfig?.extra || {};
  const demoMode = !!extras.demoMode;
  const [insecureContext, setInsecureContext] = useState(false);
  const [useWebVideo, setUseWebVideo] = useState(false); // web plain video fallback
  const videoStreamRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const [videoError, setVideoError] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  

  useEffect(() => {
    (async () => {
      try {
        // Dynamically import scanner; if not available, we'll rely on web video fallback
        const mod = await import('expo-barcode-scanner');
        LoadedBarCodeScanner = mod?.BarCodeScanner || null;
        setScannerReady(!!LoadedBarCodeScanner);
        if (LoadedBarCodeScanner?.requestPermissionsAsync) {
          const { status } = await LoadedBarCodeScanner.requestPermissionsAsync();
          setHasPermission(status === 'granted');
        }
      } catch (e) {
        // Module not available (e.g., web without native module). We'll handle web fallback below.
        setScannerReady(false);
      }
    })();
    if (Platform.OS === 'web') {
      try {
        const host = window.location.hostname;
        const proto = window.location.protocol;
        // Camera requires secure context (https or localhost). Flag if not.
        const secure = (proto === 'https:' || host === 'localhost' || host === '127.0.0.1');
        setInsecureContext(!secure);
        // On web, default to plain video preview when scanner not ready
        setUseWebVideo(true);
        // Permission hint for web: attempt a lightweight permission query
        if (navigator?.permissions && navigator?.mediaDevices?.getUserMedia) {
          (async () => {
            try {
              const perm = await navigator.permissions.query({ name: 'camera' });
              setHasPermission(perm.state === 'granted');
            } catch (_) {
              // Fallback: optimistically allow; actual error will show in start()
              setHasPermission(true);
            }
          })();
        } else {
          setHasPermission(true);
        }
      } catch (_) {}
    }
  }, []);

  // Start/stop plain video stream for web fallback (only when scanning is open)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let stream;
    async function start() {
      if (!scanning || !useWebVideo || !hasPermission) return;
      setVideoError('');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        videoStreamRef.current = stream;
      } catch (e) {
        setVideoError(e?.message || 'Unable to access camera');
      }
    }
    start();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [scanning, useWebVideo, hasPermission]);

  // When scanner is closed ensure video preview stops
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!scanning) {
        setUseWebVideo(false);
        const st = videoStreamRef.current;
        if (st) {
          st.getTracks().forEach(t => t.stop());
          videoStreamRef.current = null;
        }
      }
    }
  }, [scanning]);

  useEffect(() => {
    // Load logged-in student (demo auth)
    (async () => {
      try {
        const s = await AsyncStorage.getItem('demo:studentAuth');
        if (s) {
          const j = JSON.parse(s);
          setStudentId(String(j.rollNo || ''));
          setStudentName(String(j.name || ''));
          setStudentEmail(String(j.email || ''));
        } else {
          Alert.alert('Login required', 'Please sign in to continue.');
          navigation && navigation.replace && navigation.replace('StudentLogin');
        }
      } catch (_) {}
    })();
  }, []);

  // No inline summary here; offer navigation to My Attendance instead

  const handleSubmit = async () => {
    if (!sessionId || !token) {
      Alert.alert('Missing info', 'Enter sessionId and token from the QR.');
      return;
    }
    if (!studentId) {
      Alert.alert('Login required', 'Please sign in to continue.');
      return;
    }
    setLoading(true);
    try {
      const s = await getSession(sessionId);
      if (!s) {
        Alert.alert('Not found', 'Session not found.');
        return;
      }
      // Language group restriction: if session subject is a language class, ensure student belongs to that group
      function extractLangGroup(subject) {
        const lower = String(subject || '').toLowerCase();
        if (!lower.includes('international language competency')) return null;
        if (lower.includes('basic')) return 'Basic';
        // Check for Advance2 BEFORE Advance1 to avoid substring match issues
        if (lower.includes('advance 2') || lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
        if (lower.includes('advance 1') || lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
        if (lower.includes('a*')) return 'A*';
        return null;
      }
      
      // Helper to get all students in a language group (global, across all branches)
      function getGlobalILCGroup(grp) {
        const lists = [];
        // Top-level group (e.g., languageGroups.Basic)
        if (Array.isArray(languageGroups?.[grp])) lists.push(...languageGroups[grp]);
        // Branch-nested groups (e.g., languageGroups.ECE.Basic, languageGroups.DSAI.Basic)
        Object.keys(languageGroups || {}).forEach((k) => {
          // Skip top-level group names
          if (k === grp || k === 'Basic' || k === 'Advance1' || k === 'Advance2' || k === 'A*') return;
          const obj = languageGroups[k];
          if (obj && typeof obj === 'object' && Array.isArray(obj[grp])) lists.push(...obj[grp]);
        });
        return Array.from(new Set(lists.map(String)));
      }
      
      const grp = extractLangGroup(s.subjectName);
      if (grp) {
        const allowedStudents = getGlobalILCGroup(grp);
        const allowed = allowedStudents.includes(String(studentId));
        console.log('[StudentDemo] ILC group:', grp, 'Student:', studentId, 'Allowed:', allowed, 'Total allowed:', allowedStudents.length);
        if (!allowed) {
          Alert.alert('Group Restricted', 'You are not authorized for this language group session.');
          setLoading(false);
          return;
        }
      }
      // minimal validation in demo: token must match and not expired
      const expiresAt = s.tokenExpiresAt?.toDate ? s.tokenExpiresAt.toDate().getTime() : Date.now() - 1;
      if (token !== s.currentToken || Date.now() >= expiresAt || s.active === false) {
        Alert.alert('Invalid/Expired', 'Token invalid or expired.');
        return;
      }
      await submitAttendance(sessionId, token, studentId);
      Alert.alert('Marked Present', 'Attendance recorded (demo).');
    } catch (e) {
      Alert.alert('Error', 'Could not submit attendance.');
    } finally {
      setLoading(false);
    }
  };

  const onScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const obj = JSON.parse(data);
      if (obj.sessionId && obj.token) {
        setSessionId(String(obj.sessionId));
        setToken(String(obj.token));
        setScanning(false);
        Alert.alert('QR Parsed', 'Session and token filled from QR.');
      } else {
        Alert.alert('QR Invalid', 'QR does not contain sessionId/token.');
      }
    } catch (_) {
      Alert.alert('QR Invalid', 'Could not parse QR as JSON.');
    } finally {
      setTimeout(() => setScanned(false), 800);
    }
  };

  return (
    <GradientScreen scroll>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.textOnDark }}>Student Attendance</Text>
        <Text style={{ textAlign: 'center', color: colors.textOnDarkSecondary }}>Open camera, scan QR, then Submit.</Text>
        {insecureContext && (
          <GlassCard>
            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: '600', color: '#FCD34D' }}>Camera blocked (Insecure Context)</Text>
              <Text style={{ fontSize: 12, color: colors.textOnDarkSecondary }}>Open on HTTPS or http://localhost:8082 to enable camera.</Text>
            </View>
          </GlassCard>
        )}
        <GlassCard>
          <View style={{ gap: 10 }}>
            <PrimaryButton
              title={scanning ? 'Close Scanner' : 'Open Camera to Scan QR'}
              onPress={() => setScanning(v => !v)}
            />
            {Platform.OS === 'web' && hasPermission && (
              <PrimaryButton
                title={useWebVideo ? 'Use QR Scanner' : 'Use Plain Video Preview'}
                onPress={() => setUseWebVideo(v => !v)}
                style={{ borderRadius: 10, overflow: 'hidden' }}
              />
            )}
            {scanning && (
              hasPermission ? (
                useWebVideo && Platform.OS === 'web' ? (
                  <View style={styles.cameraWrapper}>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
                    />
                    {videoError ? (
                      <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }} pointerEvents="none">
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Video error: {videoError}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : scannerReady && LoadedBarCodeScanner ? (
                  <View style={styles.cameraWrapper}>
                    <LoadedBarCodeScanner
                      onBarCodeScanned={onScan}
                      style={StyleSheet.absoluteFillObject}
                      barCodeTypes={[LoadedBarCodeScanner.Constants.BarCodeType.qr]}
                    />
                  </View>
                ) : (
                  <View style={{ alignItems:'center', gap:8 }}>
                    <Text style={{ color: colors.textOnDarkSecondary, textAlign:'center' }}>Scanner module unavailable. Use Plain Video Preview.</Text>
                  </View>
                )
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#FCA5A5', textAlign: 'center' }}>Camera permission not granted.</Text>
                  <PrimaryButton
                    title="Retry Permission"
                    onPress={async () => {
                      try {
                        if (LoadedBarCodeScanner?.requestPermissionsAsync) {
                          const { status } = await LoadedBarCodeScanner.requestPermissionsAsync();
                          setHasPermission(status === 'granted');
                        } else if (Platform.OS === 'web' && navigator?.mediaDevices?.getUserMedia) {
                          await navigator.mediaDevices.getUserMedia({ video: true });
                          setHasPermission(true);
                        }
                      } catch (_) {}
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textOnDarkSecondary, textAlign: 'center', maxWidth: 320 }}>
                    On web: use Chrome/Edge on localhost or HTTPS and allow camera access.
                  </Text>
                </View>
              )
            )}
          </View>
        </GlassCard>

        {studentId ? (
          <GlassCard>
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textOnDarkSecondary, fontSize: 12 }}>Signed in as</Text>
              <Text style={{ fontWeight: '700', color: colors.textOnDark }}>{studentName || 'Student'}</Text>
              <Text style={{ color: colors.textOnDarkSecondary }}>{studentEmail}</Text>
              <Text style={{ color: colors.textOnDarkSecondary, fontSize: 12 }}>ID: {studentId}</Text>
            </View>
          </GlassCard>
        ) : null}

        <PrimaryButton title="My Attendance" onPress={() => navigation.navigate('MyAttendance')} />
        <PrimaryButton title={loading ? 'Submitting...' : 'Submit Attendance'} onPress={handleSubmit} />
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  cameraWrapper: {
    alignSelf: 'center',
    width: 320,
    maxWidth: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative'
  }
});
