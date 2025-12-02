import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import colors from '../theme/colors';
import { getSession, listAttendance } from '../lib/attendance';
import Constants from 'expo-constants';
import { loadStudents, loadAllStudents, compareRoll } from '../lib/students';
import languageGroups from '../data/languageGroups.json';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function SessionResultsScreen({ navigation, route }) {
  const { sessionId, branch, ilcScope, ilcGroup } = route.params || {};
  const [subjectName, setSubjectName] = useState('');
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState([]);
  const extras = Constants?.expoConfig?.extra || {};
  const [search, setSearch] = useState('');
  const [misbehaved, setMisbehaved] = useState([]);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const s = await getSession(sessionId);
      if (s) {
        setSubjectName(s.subjectName || '');
        // Language group total override
        function extractLangGroup(subject) {
          const lower = String(subject || '').toLowerCase();
            if (!lower.includes('international language competency')) return null;
            if (lower.includes('basic')) return 'Basic';
            if (lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
            if (lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
            return null;
        }
        const grp = ilcGroup || extractLangGroup(s.subjectName);
        let groupSize = s.totalStudents || 0;
        function getGlobalILCGroup(g) {
          const lists = [];
          if (Array.isArray(languageGroups[g])) lists.push(...languageGroups[g]);
          Object.keys(languageGroups).forEach((k) => {
            if (k === g || k === 'Basic' || k === 'Advance1' || k === 'Advance2' || k === 'A*') return;
            const obj = languageGroups[k];
            if (obj && typeof obj === 'object' && Array.isArray(obj[g])) lists.push(...obj[g]);
          });
          return Array.from(new Set(lists.map(String)));
        }
        if (grp) {
          if (ilcScope === 'global') {
            const arr = getGlobalILCGroup(grp);
            groupSize = arr.length || groupSize;
          } else {
            const branchGroups = languageGroups?.[branch];
            const src = branchGroups && Array.isArray(branchGroups[grp]) ? branchGroups[grp] : languageGroups[grp];
            groupSize = src ? src.length : groupSize;
          }
        }
        setPresent(s.scannedCount || 0);
        setTotal(groupSize);
        if (Array.isArray(s.misbehaved)) setMisbehaved(s.misbehaved.map(v => String(v)));
      }
      try {
        const list = await listAttendance(sessionId);
        setAttendees(Array.isArray(list) ? list : []);
      } catch (_) {
        setAttendees([]);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  const absent = total - present;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

  const presentIds = useMemo(() => new Set(attendees.map(a => String(a.userId || '').trim())), [attendees]);
  const allStudents = ilcScope === 'global' ? loadAllStudents() : loadStudents(branch);
  const computedAbsent = useMemo(() => {
    // Helper to detect language competency group from subject name
    function extractLangGroup(subject) {
      const lower = String(subject || '').toLowerCase();
      if (!lower.includes('international language competency')) return null;
      if (lower.includes('basic')) return 'Basic';
      if (lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
      if (lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
      return null;
    }
    let roster = allStudents;
    const grp = ilcGroup || extractLangGroup(subjectName);
    function getGlobalILCGroup(g) {
      const lists = [];
      if (Array.isArray(languageGroups[g])) lists.push(...languageGroups[g]);
      Object.keys(languageGroups).forEach((k) => {
        if (k === g || k === 'Basic' || k === 'Advance1' || k === 'Advance2' || k === 'A*') return;
        const obj = languageGroups[k];
        if (obj && typeof obj === 'object' && Array.isArray(obj[g])) lists.push(...obj[g]);
      });
      return Array.from(new Set(lists.map(String)));
    }
    if (grp) {
      const groupArr = ilcScope === 'global'
        ? getGlobalILCGroup(grp)
        : (languageGroups?.[branch] && Array.isArray(languageGroups[branch][grp]) ? languageGroups[branch][grp] : languageGroups[grp]);
      const allowed = groupArr ? new Set(groupArr.map(String)) : null;
      if (allowed) {
      roster = roster.filter(s => allowed.has(String(s.rollNo)));
      }
    }
    const list = roster
      .filter(s => {
        const id = String(s.rollNo || '').trim();
        return id && !presentIds.has(id);
      })
      .map(s => ({ rollNo: String(s.rollNo || '').trim(), name: String(s.name || '').trim(), mis: misbehaved.includes(String(s.rollNo || '').trim()) }));
    list.sort((a, b) => compareRoll(a.rollNo, b.rollNo));
    return list;
  }, [allStudents, presentIds, misbehaved, subjectName]);
  const filteredAbsent = useMemo(() => {
    const q = search.toLowerCase();
    return computedAbsent.filter(x => x.rollNo.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
  }, [computedAbsent, search]);

  // Separate list of misbehaved students (late/proxy) with names
  const misbehavedList = useMemo(() => {
    if (!Array.isArray(misbehaved) || misbehaved.length === 0) return [];
    const rosterIndex = new Map();
    allStudents.forEach(s => {
      const id = String(s.rollNo || '').trim();
      if (id) rosterIndex.set(id, s);
    });
    const list = misbehaved
      .map(id => {
        const s = rosterIndex.get(String(id));
        return {
          rollNo: String(id),
          name: s ? String(s.name || '').trim() : 'Unknown',
        };
      })
      .filter(x => x.rollNo && x.name);
    list.sort((a, b) => compareRoll(a.rollNo, b.rollNo));
    const q = search.toLowerCase();
    return list.filter(x => x.rollNo.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
  }, [misbehaved, allStudents, search]);

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarkAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textOnDark }}>Attendance Session Completed</Text>
          <Text style={{ color: colors.textOnDarkSecondary }}>{loading ? 'Loading...' : subjectName}</Text>
        </View>

        <BlurView intensity={40} tint="light" style={{ padding: 16, borderRadius: 16, overflow: 'hidden', gap:8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Summary</Text>
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text>Present: {present}</Text>
            <Text>Absent: {absent}</Text>
            <Text>Total: {total}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <Text>Percentage: {percentage}%</Text>
            {percentage >= 85 ? (
              <View style={{ paddingVertical:2, paddingHorizontal:8, borderRadius:12, backgroundColor: '#DCFCE7' }}>
                <Text style={{ color: '#166534', fontSize:12, fontWeight:'700' }}>High participation</Text>
              </View>
            ) : percentage < 50 ? (
              <View style={{ paddingVertical:2, paddingHorizontal:8, borderRadius:12, backgroundColor: '#FEF3C7' }}>
                <Text style={{ color: '#92400E', fontSize:12, fontWeight:'700' }}>Low participation</Text>
              </View>
            ) : null}
          </View>
        </BlurView>

        <BlurView intensity={40} tint="light" style={{ padding: 16, borderRadius: 16, overflow: 'hidden', gap:6 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.warning || '#b86b00' }}>Misbehaved (Late/Proxy)</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Scanned after 5s – treated as absent</Text>
          {misbehavedList.length > 0 && (
            <View style={{ paddingVertical:2, paddingHorizontal:8, borderRadius:12, alignSelf:'flex-start', backgroundColor:'#FEF3F2', borderWidth:1, borderColor:'#FEE4E2' }}>
              <Text style={{ color:'#B42318', fontSize:12, fontWeight:'700' }}>Proxies detected: {misbehavedList.length}</Text>
            </View>
          )}
          {misbehavedList.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No misbehaved students.</Text>
          ) : (
            misbehavedList.slice(0, 100).map(x => (
              <View key={x.rollNo} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
                <Text style={{ fontWeight: '600' }}>{x.rollNo} · {x.name}</Text>
              </View>
            ))
          )}
        </BlurView>

        <BlurView intensity={40} tint="light" style={{ padding: 16, borderRadius: 16, overflow: 'hidden' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Present Students</Text>
          {attendees.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No individual records available{extras.demoMode ? ' yet.' : ' (server mode may not list records).'}</Text>
          ) : (
            attendees.slice(0, 50).map((a) => (
              <View key={a.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
                <Text style={{ fontWeight: '600' }}>{a.userId || 'Unknown'}</Text>
                {a.createdAt ? (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{String(a.createdAt.seconds ? new Date(a.createdAt.seconds*1000).toLocaleString() : a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : a.createdAt)}</Text>
                ) : null}
              </View>
            ))
          )}
        </BlurView>

        <BlurView intensity={40} tint="light" style={{ padding: 16, borderRadius: 16, overflow: 'hidden' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.danger }}>
            Absent Students ({ilcScope === 'global' ? 'Global ILC' : (branch || 'CSE')})
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Roster source: {ilcScope === 'global' ? 'all branches' : 'branch-specific students file'}
          </Text>
          <TextInput
            placeholder="Search by roll no or name"
            value={search}
            onChangeText={setSearch}
            style={{ borderWidth: 1, borderColor: colors.dividerLight, borderRadius: 10, padding: 12, marginTop: 6, backgroundColor:'#ffffffcc' }}
          />
          {allStudents.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No roster configured.</Text>
          ) : filteredAbsent.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No absentees match the search.</Text>
          ) : (
            filteredAbsent.slice(0, 100).map((x) => (
              <View key={x.rollNo} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
                <Text style={{ fontWeight: '600' }}>{x.rollNo} · {x.name}</Text>
              </View>
            ))
          )}
        </BlurView>
        <TouchableOpacity
          onPress={() => navigation.replace('AdminDashboard')}
          style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 14 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}
