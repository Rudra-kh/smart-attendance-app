import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import colors from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listSessions, listAttendance } from '../lib/attendance';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function StudentPanelScreen({ navigation }) {
  const [student, setStudent] = useState({ id: '', name: '', email: '' });
  const [summary, setSummary] = useState([]); // [{subjectName, attended, total}]
  const [loading, setLoading] = useState(true);
  const overallPct = useMemo(() => {
    if (!summary.length) return 0;
    let att = 0, tot = 0;
    summary.forEach(s => { att += s.attended; tot += s.total; });
    return tot === 0 ? 0 : Math.round((att / tot) * 100);
  }, [summary]);

  // Require login: if no demo auth, go to login
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('demo:studentAuth');
        if (!s) {
          navigation.replace('StudentLogin');
          return;
        }
        const j = JSON.parse(s);
        setStudent({ id: String(j.rollNo || ''), name: j.name || 'Student', email: j.email || '' });
      } catch (_) {
        navigation.replace('StudentLogin');
      }
    })();
  }, [navigation]);

  // Build subject-wise attendance summary
  useEffect(() => {
    if (!student.id) return;
    (async () => {
      setLoading(true);
      try {
        const sessions = await listSessions({ pageSize: 200 });
        const bySubject = new Map();
        sessions.forEach(s => {
          const subj = String(s.subjectName || 'Unknown');
          const cur = bySubject.get(subj) || { subjectName: subj, attended: 0, total: 0 };
          cur.total += 1;
          bySubject.set(subj, cur);
        });
        const lists = await Promise.all(sessions.map(s => listAttendance(s.id)));
        lists.forEach((list, idx) => {
          const s = sessions[idx];
          const subj = String(s.subjectName || 'Unknown');
          const cur = bySubject.get(subj) || { subjectName: subj, attended: 0, total: 0 };
          const present = Array.isArray(list) && list.some(a => String(a.userId) === String(student.id));
          if (present) cur.attended += 1;
          bySubject.set(subj, cur);
        });
        const arr = Array.from(bySubject.values());
        arr.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
        setSummary(arr);
      } catch (_) {
        setSummary([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [student.id]);

  const bgBlue = colors.bgDark; // use dark gradient base
  const bgBlue2 = colors.bgDarkAlt;
  const textOnBlue = colors.textOnDark;
  const subTextOnBlue = colors.textOnDarkSecondary;

  return (
    <LinearGradient colors={[bgBlue, bgBlue2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Header: Avatar + Welcome */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#ffffff33', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff1a' }}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: '100%', height: '100%', borderRadius: 24, resizeMode: 'cover' }}
              />
            </View>
            <View>
              <Text style={{ color: textOnBlue, opacity: 0.9 }}>Welcome</Text>
              <Text style={{ color: textOnBlue, fontSize: 18, fontWeight: '700' }}>{student.name || 'Student'}</Text>
            </View>
          </View>
        </View>

        {/* Student Card (physical card style) */}
        <LinearGradient colors={[colors.secondary, '#cfe7f6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 18, padding: 16, marginBottom: 16, elevation: 6 }}>
          <Text style={{ color: '#0a1a2a', fontWeight: '700' }}>Your Student Card</Text>
          <View style={{ height: 8 }} />
          <Text style={{ color: '#0a1a2a', fontSize: 28, fontWeight: '800' }}>{overallPct}%</Text>
          <Text style={{ color: '#0a1a2a', opacity: 0.7 }}>Overall Attendance</Text>
          <View style={{ height: 16 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#0a1a2a', opacity: 0.85 }}>ID • {student.id || 'N/A'}</Text>
            <Text style={{ color: '#0a1a2a', opacity: 0.85 }}>{new Date().getFullYear()}</Text>
          </View>
        </LinearGradient>

        {/* Student Details card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, elevation: 5, shadowColor: '#00000055', gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Student Details</Text>
          <View style={{ height: 1, backgroundColor: colors.dividerLight }} />
          <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Name: <Text style={{ fontWeight: '500' }}>{student.name || 'Student'}</Text></Text>
          <Text style={{ color: colors.textSecondary }}>Email: {student.email || 'N/A'}</Text>
          <Text style={{ color: colors.textSecondary }}>ID: {student.id || 'N/A'}</Text>
        </View>

        {/* My Attendance card */}
        <View style={{ marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, elevation: 5, shadowColor: '#00000055' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>My Attendance</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyAttendance')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 1, backgroundColor: colors.dividerLight, marginTop: 8, marginBottom: 8 }} />
          {loading ? (
            <Text style={{ color: colors.textSecondary }}>Loading...</Text>
          ) : summary.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No sessions found yet.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {summary.map(item => {
                const pct = item.total === 0 ? 0 : Math.round((item.attended / item.total) * 100);
                return (
                  <TouchableOpacity
                    key={item.subjectName}
                    onPress={() => navigation.navigate('SubjectAttendance', { subjectName: item.subjectName })}
                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.dividerLight, gap: 6 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{ flex: 1, fontWeight: '600', color: colors.textPrimary }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.subjectName}
                      </Text>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: pct >= 75 ? '#DCFCE7' : '#FEE2E2' }}>
                        <Text style={{ color: pct >= 75 ? '#166534' : '#991B1B', fontWeight: '700' }}>{pct}%</Text>
                      </View>
                    </View>
                    <View style={{ height: 6, borderRadius: 4, backgroundColor: '#0000000d', overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(Math.max(pct,0),100)}%`, height: '100%', backgroundColor: colors.primary }} />
                    </View>
                    <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.attended}/{item.total} lectures</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>View</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom-center QR scanner FAB */}
      <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('StudentDemo')}
          activeOpacity={0.9}
          style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.bgLight, borderWidth: 1, borderColor: colors.dividerLight, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#00000088' }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={34} color={bgBlue} />
        </TouchableOpacity>
        <Text style={{ marginTop: 8, color: '#000', opacity: 0.9, fontWeight: '700' }}>Scan QR</Text>
      </View>
    </LinearGradient>
  );
}
