import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import { onSessionSnapshot, rotateToken, endSession, getSession } from '../lib/attendance';
import SvgQRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function QRSessionScreen({ navigation, route }) {
  const { sessionId, branch, ilcScope, ilcGroup } = route.params || {};
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [token, setToken] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [ttlSeconds, setTtlSeconds] = useState(5);
  const secondsRef = useRef(0);

  useEffect(() => {
    if (secondsRef.current !== secondsLeft) secondsRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!sessionId) return;
      const initial = await getSession(sessionId);
      if (initial) {
        setSubjectName(initial.subjectName || '');
        setTotalStudents(initial.totalStudents || 0);
        setTtlSeconds(initial.ttlSeconds || 5);
        setToken(initial.currentToken || '');
        if (initial.tokenExpiresAt?.toDate) {
          const ms = initial.tokenExpiresAt.toDate().getTime() - Date.now();
          const secs = Math.max(0, Math.ceil(ms / 1000));
          setSecondsLeft(secs);
          secondsRef.current = secs;
        }
        setScannedCount(initial.scannedCount || 0);
      }
      unsub = onSessionSnapshot(sessionId, (s) => {
        if (!s) return;
        setSubjectName(s.subjectName || '');
        setTotalStudents(s.totalStudents || 0);
        setTtlSeconds(s.ttlSeconds || 5);
        setToken(s.currentToken || '');
        if (s.currentToken) {
          // eslint-disable-next-line no-console
          console.log('QR payload', { sessionId, token: s.currentToken });
        }
        if (s.tokenExpiresAt?.toDate) {
          const ms = s.tokenExpiresAt.toDate().getTime() - Date.now();
          const secs = Math.max(0, Math.ceil(ms / 1000));
          setSecondsLeft(secs);
          secondsRef.current = secs;
        }
        setScannedCount(s.scannedCount || 0);
      });
    })();
    return () => {
      unsub && unsub();
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      if (secondsRef.current <= 1) {
        setRefreshCount((c) => c + 1);
        try {
          await rotateToken(sessionId, ttlSeconds);
        } catch (e) {
          console.warn('Token rotate failed', e);
        }
        setSecondsLeft(ttlSeconds);
        secondsRef.current = ttlSeconds;
      } else {
        setSecondsLeft((s) => Math.max(0, s - 1));
        secondsRef.current = Math.max(0, secondsRef.current - 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sessionId, ttlSeconds]);

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarkAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textOnDark }}>Attendance Session</Text>
          <Text style={{ color: colors.textOnDarkSecondary }}>{subjectName}</Text>
        </View>
        <BlurView intensity={40} tint="light" style={{ borderRadius: 16, padding: 16, overflow: 'hidden' }}>
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Students: {totalStudents}</Text>
          <Text style={{ color: colors.textSecondary }}>Refresh cycles: {refreshCount}</Text>
        </BlurView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <BlurView intensity={30} tint="light" style={{ padding: 16, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {token ? (
              <SvgQRCode value={JSON.stringify({ sessionId, token })} size={240} />
            ) : (
              <Text style={{ fontSize: 16, color: colors.textPrimary }}>Preparing QR...</Text>
            )}
            <Text style={{ fontSize: 12, marginTop: 8, color: colors.textSecondary }}>Auto refresh in: {secondsLeft}s</Text>
          </BlurView>
          {token ? (
            <View style={{ width: '100%', gap: 8 }}>
              <Text numberOfLines={2} style={{ fontSize: 12, color: colors.textOnDarkSecondary }}>
                {JSON.stringify({ sessionId, token })}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await Clipboard.setStringAsync(JSON.stringify({ sessionId, token }));
                }}
                style={{ alignSelf: 'center', borderColor: '#ffffffcc', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Copy QR JSON</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textOnDark }}>Students Scanned: {scannedCount}/{totalStudents}</Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            await endSession(sessionId);
            navigation.replace('SessionResults', { sessionId, branch, ilcScope, ilcGroup });
          }}
          style={{ backgroundColor: colors.accent, padding: 16, borderRadius: 14 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>End Session</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
