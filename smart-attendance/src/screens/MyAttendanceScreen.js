import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import colors from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listSessions, listAttendance } from '../lib/attendance';
import languageGroups from '../data/languageGroups.json';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';

export default function MyAttendanceScreen({ navigation }) {
  const [studentId, setStudentId] = useState('');
  const [subjects, setSubjects] = useState([]); // [{subjectName, attended, total, pct}]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('demo:studentAuth');
        if (!s) {
          Alert.alert('Login required', 'Please sign in to continue.');
          navigation.replace('StudentLogin');
          return;
        }
        const j = JSON.parse(s);
        const id = String(j.rollNo || '');
        setStudentId(id);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sessions = await listSessions({ pageSize: 300 });
        // Determine language group membership for student
        const groups = languageGroups || {};
        const isInGroup = (groupName) => Array.isArray(groups[groupName]) && groups[groupName].includes(String(studentId));

        // Helper to extract language group from subject
        function extractLangGroup(subject) {
          const lower = String(subject || '').toLowerCase();
          if (!lower.includes('international language competency')) return null;
          if (lower.includes('basic')) return 'Basic';
          if (lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
          if (lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
          return null; // No A* direct classes
        }

        const bySubject = new Map();
        // Filter sessions: include all non-language subjects; for language ones only include if student matches that group
        const filteredSessions = sessions.filter(s => {
          const subject = String(s.subjectName || 'Unknown');
          const grp = extractLangGroup(subject);
          if (!grp) return true; // not a language grouped subject
          return isInGroup(grp);
        });

        filteredSessions.forEach(s => {
          const subject = String(s.subjectName || 'Unknown');
          const cur = bySubject.get(subject) || { subjectName: subject, attended: 0, total: 0 };
          cur.total += 1;
          bySubject.set(subject, cur);
        });
        const lists = await Promise.all(filteredSessions.map(s => listAttendance(s.id)));
        lists.forEach((list, idx) => {
          const s = filteredSessions[idx];
          const subject = String(s.subjectName || 'Unknown');
          const cur = bySubject.get(subject) || { subjectName: subject, attended: 0, total: 0 };
          const present = Array.isArray(list) && list.some(a => String(a.userId) === String(studentId));
          if (present) cur.attended += 1;
          bySubject.set(subject, cur);
        });
        if (!cancelled) {
          const arr = Array.from(bySubject.values()).map(x => ({
            ...x,
            pct: x.total === 0 ? 0 : Math.round((x.attended / x.total) * 100)
          }));
          arr.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
          setSubjects(arr);
        }
      } catch (_) {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return (
    <GradientScreen scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ paddingHorizontal: 8, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textOnDark }}>My Attendance</Text>
        {loading ? (
          <Text style={{ color: colors.textOnDarkSecondary }}>Loading...</Text>
        ) : subjects.length === 0 ? (
          <GlassCard>
            <Text style={{ color: colors.textOnDarkSecondary }}>No subjects found.</Text>
          </GlassCard>
        ) : (
          subjects.map(s => {
            const pct = Number.isFinite(s.pct) ? s.pct : 0;
            const chipBg = pct >= 85 ? '#DCFCE7' : pct < 50 ? '#FEF3C7' : '#E5E7EB';
            const chipFg = pct >= 85 ? '#166534' : pct < 50 ? '#92400E' : colors.textPrimary;
            return (
              <GlassCard key={s.subjectName}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SubjectAttendance', { subjectName: s.subjectName })}
                  style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={{ flex: 1, fontWeight: '700', color: colors.textOnDark }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {s.subjectName}
                    </Text>
                    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12, backgroundColor: chipBg }}>
                      <Text style={{ color: chipFg, fontWeight: '700', fontSize: 12 }}>{pct}%</Text>
                    </View>
                  </View>
                  <View style={{ height: 6, borderRadius: 4, backgroundColor: '#ffffff33', overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(Math.max(pct,0),100)}%`, height: '100%', backgroundColor: colors.primary }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textOnDarkSecondary, fontSize: 12 }}>{s.attended}/{s.total} lectures</Text>
                    <Text style={{ color: colors.textOnDarkSecondary, fontSize: 12 }}>View</Text>
                  </View>
                </TouchableOpacity>
              </GlassCard>
            );
          })
        )}
        <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
      </View>
    </GradientScreen>
  );
}
