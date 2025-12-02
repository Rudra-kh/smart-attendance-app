import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, Alert } from 'react-native';
import colors from '../theme/colors';
import { createSession, listSessions } from '../lib/attendance';
import timetableCSE from '../data/timetable.json';
import timetableECE from '../data/timetable_ece.json';
import timetableDSAI from '../data/timetable_dsai.json';
import { getTotalStudents } from '../lib/students';
import languageGroups from '../data/languageGroups.json';
import { auth } from '../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrimaryButton } from '../components/ui';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

export default function AdminDashboardScreen({ navigation, route }) {
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | ended
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d; // first day of current month
  });
  const [branch, setBranch] = useState('CSE');
  const [ttlSeconds, setTtlSeconds] = useState(5);
  const [activeTab, setActiveTab] = useState('start'); // start | timetable | records | recent

  const panelStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    elevation: 5,
    shadowColor: '#00000055',
    overflow: 'hidden',
    gap: 12,
  };

  const timetableSelected = useMemo(() => {
    if (branch === 'ECE') return timetableECE;
    if (branch === 'DSAI') return timetableDSAI;
    return timetableCSE;
  }, [branch]);

  const [subjectName, setSubjectName] = useState(() => {
    const firstDay = timetableCSE.days.Monday || [];
    const firstSlotCode = firstDay.find((s) => typeof s === 'string' && s);
    return firstSlotCode && timetableCSE.slotCatalog[firstSlotCode]?.subject
      ? timetableCSE.slotCatalog[firstSlotCode].subject
      : 'Linear Algebra';
  });

  const totalStudents = useMemo(() => getTotalStudents(branch), [branch]);

  const availableSubjects = useMemo(() => {
    const arr = Object.values(timetableSelected.slotCatalog || {}).map((x) => x.subject);
    return Array.from(new Set(arr)).sort();
  }, [timetableSelected]);

  const todayName = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);
  const todayYMD = useMemo(() => new Date().toISOString().slice(0,10), []);
  const sessionsToday = useMemo(() => {
    return sessions.filter(s => {
      const created = s.createdAt?.toDate ? s.createdAt.toDate() : null;
      if (!created) return false;
      return created.toISOString().slice(0,10) === todayYMD;
    });
  }, [sessions, todayYMD]);
  const sessionsTodayCount = useMemo(() => sessionsToday.length, [sessionsToday]);
  const avgAttendancePct = useMemo(() => {
    if (!sessionsToday.length) return 0;
    let sum = 0; let counted = 0;
    sessionsToday.forEach(s => {
      const total = s.totalStudents || 0;
      if (total > 0) {
        const present = s.scannedCount || 0;
        sum += (present / total) * 100;
        counted += 1;
      }
    });
    if (!counted) return 0;
    return Math.round(sum / counted);
  }, [sessionsToday]);

  const todaySchedule = useMemo(() => {
    const day = timetableSelected.days?.[todayName];
    if (!Array.isArray(day)) return [];
    const perSlot = day.map((cell, idx) => {
      const slot = timetableSelected.timeColumns[idx];
      const isBreak = slot?.type === 'break' || cell === 'BREAK';
      const codes = Array.isArray(cell) ? cell : cell ? [cell] : [];
      const subjects = codes.map((c) => {
        const meta = timetableSelected.slotCatalog?.[c];
        if (!meta) return c;
        return meta.subject;
      });
      return { start: slot?.start, end: slot?.end, label: slot?.label, isBreak, codes, subjects };
    });
    const merged = [];
    for (let i = 0; i < perSlot.length; i++) {
      const cur = perSlot[i];
      if (cur.isBreak) { merged.push({ timeRange: cur.label, isBreak: true, subjects: [], slotCount: 1, codes: [] }); continue; }
      if (!cur.subjects.length) { merged.push({ timeRange: cur.label, isBreak: false, subjects: [], slotCount: 1, codes: [] }); continue; }
      let start = cur.start, end = cur.end, slotCount = 1;
      while (i + 1 < perSlot.length) {
        const nxt = perSlot[i+1];
        if (nxt.isBreak) break;
        const same = nxt.subjects.length === cur.subjects.length && nxt.subjects.every((s, idx) => s === cur.subjects[idx]);
        if (!same) break;
        end = nxt.end; slotCount += 1; i += 1;
      }
      const timeRange = `${start}-${end}`;
      const subjectsDisplay = cur.subjects.map((sub, si) => {
        const code = cur.codes[si];
        const meta = timetableSelected.slotCatalog?.[code];
        return `${sub} (${code}${meta?.faculty ? ` · ${meta.faculty}` : ''})`;
      });
      merged.push({ timeRange, isBreak: false, subjects: subjectsDisplay, slotCount, codes: cur.codes, baseSubjects: cur.subjects });
    }
    return merged;
  }, [todayName, timetableSelected]);

  function parseRangeMinutes(range) {
    // range like "09:00-10:00"; return { start, end } in minutes since midnight
    if (!range || typeof range !== 'string' || !range.includes('-')) return null;
    const [startStr, endStr] = range.split('-');
    const [sh, sm] = startStr.split(':').map((x) => parseInt(x, 10));
    const [eh, em] = endStr.split(':').map((x) => parseInt(x, 10));
    if ([sh, sm, eh, em].some(Number.isNaN)) return null;
    return { start: sh * 60 + sm, end: eh * 60 + em };
  }

  const [nowTs, setNowTs] = useState(Date.now());
  const nowMinutes = useMemo(() => {
    const d = new Date(nowTs);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowTs]);

  useFocusEffect(
    React.useCallback(() => {
      // refresh immediately on focus and then every 30s
      setNowTs(Date.now());
      const id = setInterval(() => setNowTs(Date.now()), 30000);
      return () => clearInterval(id);
    }, [])
  );

  const mostFrequentSubject = useMemo(() => {
    const map = new Map();
    sessions.forEach((s) => {
      const name = String(s.subjectName || '').trim();
      if (!name) return;
      map.set(name, (map.get(name) || 0) + 1);
    });
    let best = '';
    let bestCount = 0;
    for (const [k, v] of map.entries()) {
      if (v > bestCount) { best = k; bestCount = v; }
    }
    return best;
  }, [sessions]);

  const { currentSubject, upcomingSubject } = useMemo(() => {
    let current = '';
    let upcoming = '';
    for (const block of todaySchedule) {
      if (block.isBreak) continue;
      if (!block.subjects || block.subjects.length === 0) continue;
      const range = parseRangeMinutes(block.timeRange);
      if (!range) continue;
      const candidate = block.baseSubjects?.[0] || block.subjects?.[0];
      if (!candidate) continue;
      if (nowMinutes >= range.start && nowMinutes < range.end) {
        current = candidate;
        break;
      }
      if (!upcoming && nowMinutes < range.start) {
        upcoming = candidate;
      }
    }
    return { currentSubject: current, upcomingSubject: upcoming };
  }, [todaySchedule, nowMinutes]);

  const recommendedSubject = useMemo(() => {
    // Only suggest the lecture that is currently ongoing; otherwise no suggestion
    if (currentSubject) return currentSubject;
    return '';
  }, [currentSubject]);

  const finalRecommendedSubject = useMemo(() => {
    const rec = (recommendedSubject || '').trim();
    if (!rec) return '';
    if (availableSubjects.includes(rec)) return rec;
    const fuzzy = availableSubjects.find(s => s.toLowerCase().includes(rec.toLowerCase()));
    return fuzzy || availableSubjects[0] || '';
  }, [recommendedSubject, availableSubjects]);

  const recommendedTTL = useMemo(() => {
    const grp = extractLangGroup(recommendedSubject);
    if (grp) return 10; // ILC tends to need a bit more time
    return totalStudents > 60 ? 10 : 5;
  }, [recommendedSubject, totalStudents]);

  const exportSessionsCSV = async (arr) => {
    try {
      const rows = [
        ['id','subjectName','createdAt','active','scannedCount','totalStudents','ttlSeconds'],
        ...arr.map(s => [
          s.id || '',
          String(s.subjectName || ''),
          (s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : ''),
          s.active ? 'true' : 'false',
          String(s.scannedCount || 0),
          String(s.totalStudents || 0),
          String(s.ttlSeconds || ''),
        ])
      ];
      const csv = rows.map(r => r.map(v => {
        const val = String(v ?? '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return '"' + val.replace(/"/g,'""') + '"';
        }
        return val;
      }).join(',')).join('\n');
      await Clipboard.setStringAsync(csv);
      Alert.alert('Copied', 'Session list copied as CSV to clipboard.');
    } catch (e) {
      Alert.alert('Export failed', String(e?.message || e));
    }
  };

  useEffect(() => {
    // Ensure subjectName is valid for the selected branch timetable
    if (!availableSubjects.includes(subjectName)) {
      if (availableSubjects.length > 0) setSubjectName(availableSubjects[0]);
    }
  }, [branch, timetableSelected, availableSubjects]);

  const load = async () => {
    try {
      setLoading(true);
      const items = await listSessions({ pageSize: 10 });
      setSessions(Array.isArray(items) ? items : []);
    } catch (e) {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // Initialize branch from route or storage
    (async () => {
      const fromParam = route?.params?.branch;
      if (fromParam) {
        setBranch(fromParam);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem('selectedBranch');
        if (stored) setBranch(stored || 'CSE');
      } catch {
        setBranch('CSE');
      }
    })();
  }, [route?.params?.branch]);

  const filtered = useMemo(() => {
    let arr = sessions;
    if (statusFilter !== 'all') {
      arr = arr.filter((s) => (statusFilter === 'active' ? s.active : !s.active));
    }
    if (subjectFilter.trim()) {
      const q = subjectFilter.trim().toLowerCase();
      arr = arr.filter((s) => String(s.subjectName || '').toLowerCase().includes(q));
    }
    if (dateFilter) {
      const dayStart = new Date(dateFilter + 'T00:00:00');
      const dayEnd = new Date(dateFilter + 'T23:59:59');
      arr = arr.filter((s) => {
        const t = s.createdAt?.toDate ? s.createdAt.toDate().getTime() : 0;
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });
    }
    return arr;
  }, [sessions, statusFilter, subjectFilter, dateFilter]);

  // Build map of YYYY-MM-DD -> number of sessions (for calendar dots)
  const sessionDateMap = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      let created = s?.createdAt?.toDate ? s.createdAt.toDate() : null;
      if (!created && s?.tokenExpiresAt?.toDate && s.ttlSeconds) {
        const exp = s.tokenExpiresAt.toDate().getTime();
        created = new Date(exp - (s.ttlSeconds * 1000));
      }
      if (!created && typeof s?.tokenIssuedAtMs === 'number' && s.tokenIssuedAtMs > 0) {
        created = new Date(s.tokenIssuedAtMs);
      }
      if (!created) return;
      const key = created.toISOString().slice(0,10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [sessions]);

  function daysInMonth(year, month) {
    const first = new Date(year, month, 1);
    const total = new Date(year, month + 1, 0).getDate();
    const leading = first.getDay(); // 0=Sun
    const cells = [];
    for (let i=0;i<leading;i++) cells.push(null);
    for (let d=1; d<=total; d++) cells.push(new Date(year, month, d));
    return cells;
  }

  const calendarDays = useMemo(() => daysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth, sessions]);
  const monthLabel = useMemo(() => calendarMonth.toLocaleDateString(undefined,{ month:'long', year:'numeric'}), [calendarMonth]);
  const handleMonthNav = (offset) => {
    setCalendarMonth(prev => { const d = new Date(prev.getTime()); d.setMonth(d.getMonth()+offset); d.setDate(1); return d; });
  };
  function extractLangGroup(subject) {
    const lower = String(subject || '').toLowerCase();
    if (!lower.includes('international language competency')) return null;
    if (lower.includes('basic')) return 'Basic';
    if (lower.includes('advance2') || lower.includes('advance 2') || lower.includes('advanced 2')) return 'Advance2';
    if (lower.includes('advance1') || lower.includes('advance 1') || lower.includes('advanced 1')) return 'Advance1';
    return null;
  }

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const adminUid = auth?.currentUser?.uid;
      if (!adminUid) {
        // Not critical in demo; proceed without UID
      }
      const ttl = Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 5;
      const grp = extractLangGroup(subjectName);
      const getGroupSize = (g) => {
        if (!g) return totalStudents;
        const branchGroups = languageGroups?.[branch];
        if (branchGroups && Array.isArray(branchGroups[g])) return branchGroups[g].length;
        if (Array.isArray(languageGroups[g])) return languageGroups[g].length;
        return totalStudents;
      };
      const groupSize = getGroupSize(grp);
      const { id } = await createSession({ adminUid, subjectName, totalStudents: groupSize, ttlSeconds: ttl });
      if (id) {
        navigation.navigate('QRSession', { sessionId: id, branch });
      } else {
        Alert.alert('Could not start session', 'No session id returned.');
      }
    } catch (e) {
      console.warn('Failed to create session', e);
      Alert.alert('Could not start session', String(e?.message || e));
    } finally {
      setCreating(false);
    }
  };
  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarkAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <View style={{ gap:4 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textOnDark }}>Dashboard · {branch}</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ color: colors.textOnDarkSecondary }}>Good Morning, Professor!</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('BranchSelection')}
              style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:16, backgroundColor:'#ffffff33', borderWidth:1, borderColor:'#ffffff55' }}>
              <Text style={{ color:'#fff', fontSize:12, fontWeight:'600' }}>Change Branch</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor:'#FFFFFF', elevation:4, shadowColor:'#00000055', gap:2 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary }}>{sessionsTodayCount}</Text>
            <Text style={{ color: colors.textSecondary }}>Sessions Today</Text>
          </View>
          <View style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor:'#FFFFFF', elevation:4, shadowColor:'#00000055', gap:2 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary }}>{avgAttendancePct}%</Text>
            <Text style={{ color: colors.textSecondary }}>Avg Attendance</Text>
          </View>
        </View>
        <View style={{ padding: 10, borderRadius: 14, backgroundColor:'#FFFFFF', elevation:4, shadowColor:'#00000055', flexDirection:'row', gap:8 }}>
          {[
            { key:'start', label:'Start Ses...' },
            { key:'timetable', label:'Timeta...' },
            { key:'records', label:'Records' },
            { key:'upload', label:'Upload S...' },
          ].map(tab => {
            const isActive = activeTab===tab.key;
            const isLong = tab.label.length > 12;
            const fontSize = isLong ? 11 : 12;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  if (tab.key === 'upload') {
                    navigation.navigate('UploadScores', { branch });
                  } else {
                    setActiveTab(tab.key);
                  }
                }}
                style={{ flex:1, minHeight:44, justifyContent:'center', paddingVertical:10, paddingHorizontal:4, borderRadius:10, alignItems:'center', backgroundColor: isActive ? colors.palette.lightCyan : colors.bgLightAlt, borderWidth:1, borderColor: colors.dividerLight }}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontWeight:'700', textAlign:'center', letterSpacing:0.2, color: isActive ? colors.primary : colors.textPrimary, fontSize }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeTab === 'start' && (
        <View style={[panelStyle, { gap:10 }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Smart Suggestions</Text>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <View style={{ flex:1, paddingRight:12 }}>
              <Text style={{ color: colors.textSecondary }}>Current lecture</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{finalRecommendedSubject || 'No'}</Text>
              <Text style={{ marginTop:4, color: colors.textSecondary }}>TTL suggestion: {finalRecommendedSubject ? `${recommendedTTL}s` : '—'}</Text>
            </View>
            <View style={{ gap:8, width:160 }}>
              <PrimaryButton
                title="Use Suggestion"
                variant="secondary"
                onPress={() => { if (!finalRecommendedSubject) return; setSubjectName(finalRecommendedSubject); setTtlSeconds(String(recommendedTTL)); }}
                disabled={!finalRecommendedSubject}
              />
              <PrimaryButton
                title="Start Suggested"
                onPress={async () => {
                  if (creating) return;
                  if (!finalRecommendedSubject) return;
                  setCreating(true);
                  try {
                    const adminUid = auth?.currentUser?.uid;
                    const ttl = Number(recommendedTTL);
                    const subj = finalRecommendedSubject;
                    const grp = extractLangGroup(subj);
                    const branchGroups = languageGroups?.[branch];
                    const groupSize = grp ? (branchGroups && Array.isArray(branchGroups[grp]) ? branchGroups[grp].length : Array.isArray(languageGroups[grp]) ? languageGroups[grp].length : totalStudents) : totalStudents;
                    const { id } = await createSession({ adminUid, subjectName: subj, totalStudents: groupSize, ttlSeconds: ttl });
                    if (id) navigation.navigate('QRSession', { sessionId: id, branch });
                    else Alert.alert('Could not start session', 'No session id returned.');
                  } catch (e) {
                    Alert.alert('Could not start session', String(e?.message || e));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={!finalRecommendedSubject}
              />
            </View>
          </View>
        </View>
        )}
        {activeTab === 'start' && (
        <View style={panelStyle}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Start a Session</Text>
        <Text style={{ color: colors.textSecondary }}>Total students (branch): {totalStudents}</Text>
        <TextInput
          placeholder="Subject name"
          value={subjectName}
          onChangeText={setSubjectName}
          style={{ borderWidth: 1, borderColor: colors.dividerLight, borderRadius: 10, padding: 12, backgroundColor:'#ffffffcc' }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {availableSubjects.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSubjectName(s)}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.dividerLight, backgroundColor: subjectName === s ? '#E0F2FE' : '#ffffffaa' }}>
              <Text style={{ color: subjectName === s ? colors.primary : colors.textPrimary, fontSize:12 }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text>TTL (sec):</Text>
          <TextInput
            placeholder="5"
            keyboardType="number-pad"
            value={String(ttlSeconds)}
            onChangeText={(t) => setTtlSeconds(t.replace(/[^0-9]/g, ''))}
            style={{ width: 100, borderWidth: 1, borderColor: colors.dividerLight, borderRadius: 10, padding: 12, backgroundColor:'#ffffffcc' }}
          />
        </View>
        <TouchableOpacity
          onPress={handleCreate}
          style={{ backgroundColor: colors.accent, padding: 16, borderRadius: 14, opacity: creating ? 0.7 : 1 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800', letterSpacing:0.5 }}>{creating ? 'Creating...' : 'Start New Session'}</Text>
        </TouchableOpacity>
        </View>
        )}
        {activeTab === 'timetable' && (
        <View style={panelStyle}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Today's Classes ({todayName})</Text>
          {todaySchedule.filter((s) => s.isBreak || s.subjects.length > 0).map((s, i) => (
            <View key={i} style={{ borderRadius: 12, padding: 12, gap: 6, backgroundColor:'#F8FAFC', borderWidth:1, borderColor: colors.dividerLight }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                <Text style={{ fontWeight: '700' }}>⏰ {s.timeRange}</Text>
                {s.slotCount > 1 && !s.isBreak && (
                  <View style={{ backgroundColor: '#E0F2FE', paddingVertical:2, paddingHorizontal:8, borderRadius:12 }}>
                    <Text style={{ fontSize:11, color: colors.primary }}>{s.slotCount} slots</Text>
                  </View>
                )}
              </View>
              {s.isBreak ? (
                <Text style={{ color: colors.textSecondary }}>Break</Text>
              ) : (
                <>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                    {s.subjects.map((label, idx2) => (
                      <View key={idx2} style={{ paddingVertical:4, paddingHorizontal:8, borderRadius:12, backgroundColor:'#f1f5f9', borderWidth:1, borderColor: colors.dividerLight }}>
                        <Text style={{ fontSize:12, color: colors.textPrimary }} numberOfLines={1}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop:6 }}>
                    {s.baseSubjects.map((subj, idx) => (
                      <TouchableOpacity
                        key={`${subj}-${idx}`}
                        onPress={async () => {
                          if (creating) return;
                          setCreating(true);
                          try {
                            const adminUid = auth?.currentUser?.uid;
                            const ttl = Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 5;
                            const grp = extractLangGroup(subj);
                            const branchGroups = languageGroups?.[branch];
                            const groupSize = grp ? (branchGroups && Array.isArray(branchGroups[grp]) ? branchGroups[grp].length : Array.isArray(languageGroups[grp]) ? languageGroups[grp].length : totalStudents) : totalStudents;
                            const { id } = await createSession({ adminUid, subjectName: subj, totalStudents: groupSize, ttlSeconds: ttl });
                            if (id) navigation.navigate('QRSession', { sessionId: id, branch });
                            else Alert.alert('Could not start session', 'No session id returned.');
                          } catch (e) {
                            Alert.alert('Could not start session', String(e?.message || e));
                          } finally {
                            setCreating(false);
                          }
                        }}
                        style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.primary }}>
                        <Text style={{ color: '#fff', fontWeight:'700' }}>Start {subj}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          ))}
          {todaySchedule.every((s) => !s.isBreak && s.subjects.length === 0) ? (
            <Text style={{ color: colors.textSecondary }}>No classes scheduled.</Text>
          ) : null}
        </View>
        )}
        {activeTab === 'records' && (
        <View style={[panelStyle, { gap:14 }]}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Filters</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setStatusFilter('all')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: statusFilter==='all'?'#E5E7EB':'transparent', borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStatusFilter('active')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: statusFilter==='active'?'#E5E7EB':'transparent', borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStatusFilter('ended')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: statusFilter==='ended'?'#E5E7EB':'transparent', borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text>Ended</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600', color: colors.textSecondary }}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            <TouchableOpacity
              onPress={() => setSubjectFilter('')}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.dividerLight, backgroundColor: subjectFilter===''?colors.palette.lightCyan:colors.bgLightAlt }}>
              <Text style={{ color: subjectFilter===''?colors.primary:colors.textSecondary, fontSize:12 }}>All</Text>
            </TouchableOpacity>
            {availableSubjects.map(sub => (
              <TouchableOpacity
                key={sub}
                onPress={() => setSubjectFilter(sub)}
                style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.dividerLight, backgroundColor: subjectFilter===sub?colors.palette.lightCyan:colors.bgLightAlt }}>
                <Text style={{ color: subjectFilter===sub?colors.primary:colors.textPrimary, fontSize:12 }}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight:'600', color: colors.textSecondary }}>Date</Text>
          <View style={{ backgroundColor: colors.palette.softIce, borderRadius:14, borderWidth:1, borderColor: colors.dividerLight, padding:10, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{ width:0, height:4 }, elevation:2 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <TouchableOpacity onPress={() => handleMonthNav(-1)} style={{ paddingVertical:4, paddingHorizontal:10, borderRadius:8, backgroundColor:'#F3F4F6' }}>
                <Text>{'<'}</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight:'700' }}>{monthLabel}</Text>
              <TouchableOpacity onPress={() => handleMonthNav(1)} style={{ paddingVertical:4, paddingHorizontal:10, borderRadius:8, backgroundColor:'#F3F4F6' }}>
                <Text>{'>'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <View key={d} style={{ width:'14.285%', paddingVertical:4 }}>
                  <Text style={{ textAlign:'center', fontWeight:'600', fontSize:12 }}>{d}</Text>
                </View>
              ))}
              {calendarDays.map((d,i) => {
                if (d===null) return <View key={'b'+i} style={{ width:'14.285%', paddingVertical:18 }} />;
                const key = d.toISOString().slice(0,10);
                const count = sessionDateMap.get(key) || 0;
                const selected = dateFilter === key;
                let bg = colors.bgLight;
                if (selected) bg = colors.palette.skyBlue;
                else if (count>0) bg = colors.palette.paleLime;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setDateFilter(prev => prev === key ? '' : key)}
                    style={{ width:'14.285%', padding:2 }}>
                    <View style={{ borderRadius:10, paddingVertical:10, backgroundColor:bg, borderWidth:1, borderColor: colors.dividerLight, position:'relative' }}>
                      <Text style={{ textAlign:'center', fontWeight:'600', fontSize:12 }}>{d.getDate()}</Text>
                      {count>0 && (
                        <View style={{ position:'absolute', bottom:4, left:0, right:0, alignItems:'center' }}>
                          <View style={{ width:6, height:6, borderRadius:3, backgroundColor: colors.primary }} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
            <TouchableOpacity
              onPress={() => setDateFilter(new Date().toISOString().slice(0,10))}
              style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:16, borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#F3F4F6' }}>
              <Text>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { const d=new Date(); d.setDate(d.getDate()-1); setDateFilter(d.toISOString().slice(0,10)); }}
              style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:16, borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#F3F4F6' }}>
              <Text>Yesterday</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDateFilter('')}
              style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:18, borderWidth:1, borderColor: colors.dividerLight, backgroundColor: dateFilter===''?colors.palette.lightCyan:colors.bgLightAlt }}>
              <Text style={{ color: dateFilter===''?colors.primary:colors.textSecondary, fontSize:12 }}>Clear Date</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setSubjectFilter(''); setDateFilter(''); setStatusFilter('all'); }}
              style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:18, borderWidth:1, borderColor: colors.primary, backgroundColor: colors.primary }}>
              <Text style={{ color: colors.bgLight, fontSize:12, fontWeight:'600' }}>Reset All</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
        )}
        {activeTab === 'records' && (
        <View style={panelStyle}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Sessions</Text>
          <Text style={{ color: colors.textSecondary, fontSize:12 }}>{filtered.length}/{sessions.length}</Text>
        </View>
        <View style={{ flexDirection:'row', gap:8 }}>
          <PrimaryButton title="Copy CSV" variant="secondary" onPress={() => exportSessionsCSV(filtered)} />
          <PrimaryButton title="Clear Filters" variant="secondary" onPress={() => { setStatusFilter('all'); setSubjectFilter(''); setDateFilter(''); }} />
        </View>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
          {statusFilter!=='all' && (
            <View style={{ paddingVertical:4, paddingHorizontal:8, backgroundColor: colors.palette.lightCyan, borderRadius:12 }}>
              <Text style={{ fontSize:11, color: colors.primary }}>Status: {statusFilter}</Text>
            </View>
          )}
          {subjectFilter && (
            <View style={{ paddingVertical:4, paddingHorizontal:8, backgroundColor: colors.palette.skyBlue, borderRadius:12 }}>
              <Text style={{ fontSize:11, color: colors.textPrimary }} numberOfLines={1}>Subject: {subjectFilter}</Text>
            </View>
          )}
          {dateFilter && (
            <View style={{ paddingVertical:4, paddingHorizontal:8, backgroundColor: colors.palette.paleLime, borderRadius:12 }}>
              <Text style={{ fontSize:11, color: colors.textPrimary }}>Date: {dateFilter}</Text>
            </View>
          )}
        </View>
        {sessions.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>{loading ? 'Loading…' : 'No sessions yet.'}</Text>
        ) : (filtered.length === 0) ? (
          <View style={{ alignItems:'center', gap:8 }}>
            <Text style={{ color: colors.textSecondary }}>No sessions match current filters.</Text>
            <PrimaryButton title="Clear Filters" variant="secondary" onPress={() => { setStatusFilter('all'); setSubjectFilter(''); setDateFilter(''); }} />
          </View>
        ) : (
          filtered.map((s) => {
            const created = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : '';
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  if (s.active) navigation.navigate('QRSession', { sessionId: s.id, branch });
                  else navigation.navigate('SessionResults', { sessionId: s.id, branch });
                }}
                style={{ borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor:'#ffffffcc' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>{s.subjectName || 'Session'}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{created}</Text>
                  </View>
                  <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: s.active ? '#DBEAFE' : '#F3F4F6' }}>
                    <Text style={{ color: s.active ? colors.primary : colors.textSecondary }}>{s.active ? 'Active' : 'Ended'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
