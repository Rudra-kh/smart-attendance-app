import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, Modal } from 'react-native';
import colors from '../../theme/colors';
import { getSession, submitAttendance } from '../../lib/attendance';
import languageGroups from '../../data/languageGroups.json';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../../components/ui';

let LoadedBarCodeScanner = null;

export default function ScanTab({ student, navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [markedSubject, setMarkedSubject] = useState('');
  const [markedTime, setMarkedTime] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  
  // Custom alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', icon: 'alert-circle', iconColor: '#EF4444', buttons: [] });

  const showAlert = (title, message, icon = 'alert-circle', iconColor = '#EF4444', buttons = []) => {
    setAlertConfig({ title, message, icon, iconColor, buttons });
    setAlertVisible(true);
  };

  // Helper functions for ILC
  const isILCSession = (subject) => {
    const lower = String(subject || '').toLowerCase();
    return lower.includes('international language competency');
  };

  const extractLangGroup = (subject) => {
    const lower = String(subject || '').toLowerCase();
    if (!lower.includes('international language competency')) return null;
    if (lower.includes('basic')) return 'Basic';
    // Check for Advance2 BEFORE Advance1 to avoid substring match issues
    if (lower.includes('advance 2') || lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
    if (lower.includes('advance 1') || lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
    if (lower.includes('a*')) return 'A*';
    return null;
  };

  const getGlobalILCGroup = (grp) => {
    const lists = [];
    if (Array.isArray(languageGroups?.[grp])) lists.push(...languageGroups[grp]);
    Object.keys(languageGroups || {}).forEach((k) => {
      if (k === grp || k === 'Basic' || k === 'Advance1' || k === 'Advance2' || k === 'A*') return;
      const obj = languageGroups[k];
      if (obj && typeof obj === 'object' && Array.isArray(obj[grp])) lists.push(...obj[grp]);
    });
    return Array.from(new Set(lists.map(String)));
  };

  useEffect(() => {
    (async () => {
      try {
        const mod = await import('expo-barcode-scanner');
        LoadedBarCodeScanner = mod?.BarCodeScanner || null;
        setScannerReady(!!LoadedBarCodeScanner);
        if (LoadedBarCodeScanner?.requestPermissionsAsync) {
          const { status } = await LoadedBarCodeScanner.requestPermissionsAsync();
          setHasPermission(status === 'granted');
        }
      } catch (e) {
        setScannerReady(false);
      }
    })();
  }, []);

  const handleAutoSubmit = async (sessionId, token) => {
    if (!student?.id) {
      showAlert('Login Required', 'Please sign in to continue.', 'account-alert', '#F59E0B');
      return;
    }
    
    setLoading(true);
    try {
      const s = await getSession(sessionId);
      if (!s) {
        showAlert('Not Found', 'Session not found.', 'calendar-remove', '#EF4444');
        setLoading(false);
        return;
      }

      const isILC = isILCSession(s.subjectName);
      console.log('[ScanTab] Session:', s.subjectName, 'isILC:', isILC, 'student:', student.id);

      if (isILC) {
        const grp = extractLangGroup(s.subjectName);
        console.log('[ScanTab] ILC Group extracted:', grp);
        if (grp) {
          const allowedStudents = getGlobalILCGroup(grp);
          console.log('[ScanTab] Allowed students for', grp, ':', allowedStudents.length, 'students');
          const allowed = allowedStudents.includes(String(student.id));
          console.log('[ScanTab] Is student allowed:', allowed);
          if (!allowed) {
            showAlert('Group Restricted', 'You are not authorized for this language group session.', 'account-lock', '#EF4444');
            setLoading(false);
            return;
          }
        }
      } else {
        let studentBranch = student.branch || '';
        if (!studentBranch && student.id) {
          if (student.id.startsWith('25101')) studentBranch = 'ECE';
          else if (student.id.startsWith('25102')) studentBranch = 'DSAI';
          else if (student.id.startsWith('25100')) studentBranch = 'CSE';
        }

        const sessionBranch = s.branch || '';

        // Only check branch if session has branch info - allow legacy sessions without branch
        if (sessionBranch && studentBranch && sessionBranch !== studentBranch) {
          showAlert('Branch Mismatch', `You cannot attend ${sessionBranch} classes. You are a ${studentBranch} student.`, 'school', '#EF4444');
          setLoading(false);
          setScanned(false);
          return;
        }
      }

      await submitAttendance(sessionId, token, student.id);

      // Success!
      setMarkedSubject(s.subjectName || 'Class');
      setMarkedTime(new Date().toLocaleTimeString());
      setAttendanceMarked(true);
      setScanning(false);
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('invalid') || msg.includes('expired')) {
        showAlert('Token Expired', 'Please scan the QR again - the token refreshes every few seconds.', 'clock-alert', '#F59E0B');
      } else if (msg.includes('already marked')) {
        showAlert('Already Marked', 'Your attendance is already marked for this session.', 'check-circle', '#10B981');
      } else if (msg.includes('branch-mismatch')) {
        showAlert('Branch Mismatch', 'You cannot attend classes of a different branch.', 'school', '#EF4444');
      } else {
        showAlert('Error', 'Could not submit attendance. Please try again.', 'alert-circle', '#EF4444');
      }
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  const onScan = ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    
    try {
      const obj = JSON.parse(data);
      if (obj.sessionId && obj.token) {
        handleAutoSubmit(obj.sessionId, obj.token);
      } else {
        showAlert('Invalid QR', 'QR code does not contain valid session data.', 'qrcode', '#EF4444');
        setTimeout(() => setScanned(false), 1500);
      }
    } catch (_) {
      showAlert('Invalid QR', 'Could not parse QR code.', 'qrcode', '#EF4444');
      setTimeout(() => setScanned(false), 1500);
    }
  };

  const requestPermission = async () => {
    if (LoadedBarCodeScanner?.requestPermissionsAsync) {
      const { status } = await LoadedBarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    }
  };

  if (attendanceMarked) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.successIconContainer}>
            <MaterialCommunityIcons name="check-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Attendance Marked!</Text>
          <Text style={styles.successSubject}>{markedSubject}</Text>
          <Text style={styles.successTime}>{markedTime}</Text>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => setAttendanceMarked(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        buttons={alertConfig.buttons.length > 0 ? alertConfig.buttons : [{ text: 'OK', onPress: () => setAlertVisible(false) }]}
        onClose={() => setAlertVisible(false)}
      />
      
      <Text style={styles.title}>Scan QR Code</Text>
      <Text style={styles.subtitle}>Point camera at professor's QR code to mark attendance</Text>

      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => setScanning(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.secondary, '#B8D4E8']}
          style={styles.scanButtonGradient}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={80} color={colors.bgDark} />
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.tapText}>Tap to Start Scanning</Text>

      {/* Student Info Card */}
      <View style={styles.studentCard}>
        <View style={styles.studentRow}>
          <MaterialCommunityIcons name="account" size={20} color={colors.textSecondary} />
          <Text style={styles.studentName}>{student?.name || 'Student'}</Text>
        </View>
        <View style={styles.studentRow}>
          <MaterialCommunityIcons name="badge-account" size={20} color={colors.textSecondary} />
          <Text style={styles.studentId}>{student?.id || 'N/A'}</Text>
        </View>
        <View style={styles.studentRow}>
          <MaterialCommunityIcons name="school" size={20} color={colors.textSecondary} />
          <Text style={styles.studentBranch}>{student?.branch || 'N/A'}</Text>
        </View>
      </View>

      {/* Scanner Modal */}
      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={() => setScanning(false)}
      >
        <View style={styles.scannerContainer}>
          {hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <MaterialCommunityIcons name="camera-off" size={60} color="#EF4444" />
              <Text style={styles.permissionText}>Camera permission required</Text>
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : scannerReady && LoadedBarCodeScanner ? (
            <LoadedBarCodeScanner
              onBarCodeScanned={scanned ? undefined : onScan}
              style={StyleSheet.absoluteFillObject}
              barCodeTypes={[LoadedBarCodeScanner.Constants.BarCodeType.qr]}
            />
          ) : (
            <View style={styles.permissionContainer}>
              <MaterialCommunityIcons name="camera-off" size={60} color="#F59E0B" />
              <Text style={styles.permissionText}>Scanner not available</Text>
            </View>
          )}
          
          {/* Scanner Overlay */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.scanInstruction}>
                {loading ? 'Submitting...' : 'Align QR code within frame'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => { setScanning(false); setScanned(false); }}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textOnDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textOnDarkSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  scanButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnDark,
    marginTop: 20,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 40,
    width: '100%',
    elevation: 3,
    gap: 12,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  studentId: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  studentBranch: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    gap: 20,
  },
  permissionText: {
    color: '#FFF',
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.secondary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 30,
    gap: 20,
  },
  scanInstruction: {
    color: '#FFF',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    elevation: 4,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
  },
  successSubject: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 30,
  },
  doneButton: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: 50,
    paddingVertical: 14,
    borderRadius: 30,
  },
  doneButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
