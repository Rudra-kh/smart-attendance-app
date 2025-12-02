import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import colors from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listSessions, listAttendance } from '../lib/attendance';
import languageGroups from '../data/languageGroups.json';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';

export default function SubjectAttendanceScreen({ navigation, route }) {
  const { subjectName } = route.params || {};
  const [studentId, setStudentId] = useState('');
  const [items, setItems] = useState([]); // [{id, dateLabel, status}]
  const [summary, setSummary] = useState({ attended: 0, total: 0, pct: 0 });
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d; // first day of current month
  });

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
        setStudentId(String(j.rollNo || ''));
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (!studentId || !subjectName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sessionsAll = await listSessions({ pageSize: 500 });
        // group filtering for language subjects
        const groups = languageGroups || {};
        const isInGroup = (groupName) => Array.isArray(groups[groupName]) && groups[groupName].includes(String(studentId));
        function extractLangGroup(subject) {
          const lower = String(subject || '').toLowerCase();
          if (!lower.includes('international language competency')) return null;
          if (lower.includes('basic')) return 'Basic';
          if (lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
          if (lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
          return null; // A* has no dedicated class subject strings
        }
        const sessions = sessionsAll.filter(s => {
          const subj = String(s.subjectName || 'Unknown');
          if (subj !== String(subjectName)) return false;
          const grp = extractLangGroup(subj);
            if (!grp) return true; // not a language grouped subject
            return isInGroup(grp); // only include if student belongs
        });
        // Guard: if language subject but student not in group -> show message
        const requestedGroup = extractLangGroup(String(subjectName));
        if (requestedGroup && !isInGroup(requestedGroup)) {
          if (!cancelled) {
            setItems([]);
            setSummary({ attended: 0, total: 0, pct: 0 });
          }
          Alert.alert('Access Restricted', 'This language group does not match your assigned group.');
          return;
        }
        // newest first
        sessions.sort((a, b) => {
          const ta = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });
        const lists = await Promise.all(sessions.map(s => listAttendance(s.id)));
        let attended = 0;
        const out = sessions.map((s, idx) => {
          let created = s?.createdAt?.toDate ? s.createdAt.toDate() : null;
          // Fallback 1: derive from tokenExpiresAt - ttlSeconds
          if (!created && s?.tokenExpiresAt?.toDate && s.ttlSeconds) {
            const exp = s.tokenExpiresAt.toDate().getTime();
            created = new Date(exp - (s.ttlSeconds * 1000));
          }
          // Fallback 2: tokenIssuedAtMs (demo mode)
          if (!created && typeof s?.tokenIssuedAtMs === 'number' && s.tokenIssuedAtMs > 0) {
            created = new Date(s.tokenIssuedAtMs);
          }
          const dateLabel = created ? created.toLocaleString() : 'Unknown time';
          const present = Array.isArray(lists[idx]) && lists[idx].some(a => String(a.userId) === String(studentId));
          let status = 'Absent';
          if (present) {
            status = 'Present';
            attended += 1;
          } else if (Array.isArray(s.misbehaved) && s.misbehaved.map(String).includes(String(studentId))) {
            status = 'Absent (Misbehaved)';
          }
          return { id: s.id, dateLabel, status };
        });
        const total = sessions.length;
        const pct = total === 0 ? 0 : Math.round((attended / total) * 100);
        if (!cancelled) {
          setItems(out);
          setSummary({ attended, total, pct });
        }
      } catch (_) {
        if (!cancelled) {
          setItems([]);
          setSummary({ attended: 0, total: 0, pct: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId, subjectName]);

  // Build map date (YYYY-MM-DD) -> status (Present | Absent | Absent (Misbehaved))
  const dayStatusMap = useMemo(() => {
    const map = new Map();
    items.forEach(it => {
      // dateLabel is locale; recompute canonical date from underlying session createdAt? We only stored string.
      // We derive from dateLabel by new Date(dateLabel); fallback to today.
      let dt = new Date(it.dateLabel);
      if (isNaN(dt.getTime())) dt = new Date();
      const key = dt.toISOString().slice(0,10); // YYYY-MM-DD
      const existing = map.get(key);
      // Present overrides absent
      if (existing === 'Present') return; // keep present
      if (it.status.startsWith('Present')) {
        map.set(key, 'Present');
      } else if (it.status.includes('Misbehaved')) {
        // only set if not present
        if (existing !== 'Present') map.set(key, 'Absent (Misbehaved)');
      } else {
        if (!existing) map.set(key, 'Absent');
      }
    });
    return map;
  }, [items]);

  function daysInMonth(year, month) { // month 0-11
    const first = new Date(year, month, 1);
    const days = [];
    const firstWeekday = first.getDay(); // 0 Sun
    // Fill leading blanks
    for (let i=0;i<firstWeekday;i++) days.push(null);
    const total = new Date(year, month+1, 0).getDate();
    for (let d=1; d<=total; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }

  const calendarDays = useMemo(() => daysInMonth(monthCursor.getFullYear(), monthCursor.getMonth()), [monthCursor, items]);
  const monthLabel = useMemo(() => monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [monthCursor]);

  function nextMonth(offset) {
    setMonthCursor(prev => {
      const d = new Date(prev.getTime());
      d.setMonth(d.getMonth()+offset);
      d.setDate(1);
      return d;
    });
  }

  return (
    <GradientScreen scroll>
      <View style={{ paddingHorizontal: 8, paddingBottom: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textOnDark }}>{subjectName || 'Subject'}</Text>
        <GlassCard>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: '600', color: colors.textOnDark }}>Summary</Text>
            {loading ? (
              <Text style={{ color: colors.textOnDarkSecondary }}>Loading...</Text>
            ) : (
              <>
                <Text style={{ color: colors.textOnDarkSecondary }}>Present: {summary.attended}</Text>
                <Text style={{ color: colors.textOnDarkSecondary }}>Total Classes: {summary.total}</Text>
                <Text style={{ color: colors.textOnDarkSecondary }}>Percentage: {summary.pct}%</Text>
              </>
            )}
          </View>
        </GlassCard>
        {/* Calendar View */}
        <GlassCard>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => nextMonth(-1)} style={{ paddingVertical:4, paddingHorizontal:10, borderRadius:8, backgroundColor:'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: colors.textOnDark }}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight: '700', color: colors.textOnDark }}>{monthLabel}</Text>
              <TouchableOpacity onPress={() => nextMonth(1)} style={{ paddingVertical:4, paddingHorizontal:10, borderRadius:8, backgroundColor:'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: colors.textOnDark }}>{'>'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <View key={d} style={{ width:'14.285%', paddingVertical:4 }}>
                  <Text style={{ textAlign:'center', fontWeight:'600', fontSize:12, color: colors.textOnDarkSecondary }}>{d}</Text>
                </View>
              ))}
              {calendarDays.map((d,i) => {
                if (d === null) return <View key={'b'+i} style={{ width:'14.285%', paddingVertical:18 }} />;
                const key = d.toISOString().slice(0,10);
                const status = dayStatusMap.get(key); // undefined | Present | Absent | Absent (Misbehaved)
                let bg = 'rgba(255,255,255,0.08)';
                let color = colors.textOnDark;
                if (status === 'Present') { bg = 'rgba(16,185,129,0.25)'; color = '#D1FAE5'; }
                else if (status === 'Absent') { bg = 'rgba(239,68,68,0.25)'; color = '#FECACA'; }
                else if (status === 'Absent (Misbehaved)') { bg = 'rgba(245,158,11,0.25)'; color = '#FDE68A'; }
                return (
                  <View key={key} style={{ width:'14.285%', padding:2 }}>
                    <View style={{ borderRadius:8, paddingVertical:10, backgroundColor:bg }}>
                      <Text style={{ textAlign:'center', color, fontWeight:'700', fontSize:12 }}>{d.getDate()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:14, height:14, borderRadius:4, backgroundColor:'rgba(16,185,129,0.6)' }} />
                <Text style={{ fontSize:12, color: colors.textOnDarkSecondary }}>Present</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:14, height:14, borderRadius:4, backgroundColor:'rgba(239,68,68,0.6)' }} />
                <Text style={{ fontSize:12, color: colors.textOnDarkSecondary }}>Absent</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <View style={{ width:14, height:14, borderRadius:4, backgroundColor:'rgba(245,158,11,0.6)' }} />
                <Text style={{ fontSize:12, color: colors.textOnDarkSecondary }}>Misbehaved</Text>
              </View>
            </View>
          </View>
        </GlassCard>
        <GlassCard>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: '600', color: colors.textOnDark }}>Sessions</Text>
            {loading ? (
              <Text style={{ color: colors.textOnDarkSecondary }}>Loading sessions...</Text>
            ) : items.length === 0 ? (
              <Text style={{ color: colors.textOnDarkSecondary }}>No sessions yet.</Text>
            ) : (
              items.map(item => (
                <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.glassBorder }}>
                  <Text style={{ fontWeight: '600', color: colors.textOnDark }}>{item.dateLabel}</Text>
                  <Text style={{ color: item.status.startsWith('Present') ? '#86EFAC' : item.status.includes('Misbehaved') ? ('#FCA5A5') : '#FECACA' }}>
                    {item.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        </GlassCard>
        <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
      </View>
    </GradientScreen>
  );
}
