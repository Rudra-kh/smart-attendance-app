import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';
import colors from '../theme/colors';
import languageGroups from '../data/languageGroups.json';
import { createSession } from '../lib/attendance';
import { auth } from '../lib/firebase';

const BRANCHES = ['CSE', 'DSAI', 'ECE'];

export default function BranchSelectionScreen({ navigation }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('selectedBranch');
        if (stored) {
          setSelected(stored);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persistAndGo = async (branch) => {
    setSelected(branch);
    try {
      await AsyncStorage.setItem('selectedBranch', branch);
    } catch {}
    navigation.replace('AdminDashboard', { branch });
  };

  function getGlobalILCGroup(grp) {
    const lists = [];
    if (Array.isArray(languageGroups[grp])) lists.push(...languageGroups[grp]); // top-level (CSE)
    Object.keys(languageGroups).forEach((k) => {
      if (k === grp || k === 'Basic' || k === 'Advance1' || k === 'Advance2' || k === 'A*') return;
      const obj = languageGroups[k];
      if (obj && typeof obj === 'object' && Array.isArray(obj[grp])) lists.push(...obj[grp]);
    });
    const uniq = Array.from(new Set(lists.map(String)));
    return uniq;
  }

  const startILCSession = async (groupKey) => {
    if (!selected) {
      Alert.alert('Select Branch', 'Please select a branch first.');
      return;
    }
    try {
      const adminUid = auth?.currentUser?.uid;
      const ttlSeconds = 5;
      let subjectName = 'International Language Competency';
      if (groupKey === 'Basic') subjectName = 'International Language Competency (Basic)';
      else if (groupKey === 'Advance1') subjectName = 'International Language Competency (Advance 1)';
      else if (groupKey === 'Advance2') subjectName = 'International Language Competency (Advance 2)';
      else if (groupKey === 'A*') subjectName = 'International Language Competency (A*)';

      let totalStudents = getGlobalILCGroup(groupKey).length;
      if (totalStudents <= 0) totalStudents = 1; // safe minimum

      const { id } = await createSession({ adminUid, subjectName, totalStudents, ttlSeconds });
      if (id) navigation.navigate('QRSession', { sessionId: id, branch: selected, ilcScope: 'global', ilcGroup: groupKey });
      else Alert.alert('Could not start session', 'No session id returned.');
    } catch (e) {
      Alert.alert('Could not start session', String(e?.message || e));
    }
  };

  return (
    <GradientScreen>
      <View style={{ flex: 1, padding: 24, gap: 24 }}>
        <GlassCard style={{ gap: 14 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Select Branch</Text>
          <Text style={{ color: colors.textSecondary }}>Please choose the branch to manage attendance.</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {BRANCHES.map((b) => {
              const active = selected === b;
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => setSelected(b)}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.primary : colors.glassBg,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.glassBorder
                  }}>
                  <Text style={{ color: active ? '#fff' : colors.textPrimary, fontWeight: '700', letterSpacing: 0.4 }}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {loading ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Loading previous selection…</Text>
          ) : (
            <PrimaryButton
              title={selected ? `Continue (${selected})` : 'Continue'}
              disabled={!selected}
              onPress={() => selected && persistAndGo(selected)}
              style={{ marginTop: 8 }}
            />
          )}
        </GlassCard>
        <GlassCard style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>International Language Competency</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Global groups (not branch-wise)</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
            <TouchableOpacity onPress={() => startILCSession('Basic')} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:18, backgroundColor: colors.primary }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>International Language Competency (Basic)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startILCSession('Advance1')} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:18, backgroundColor: colors.primary }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>International Language Competency (Advance 1)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startILCSession('Advance2')} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:18, backgroundColor: colors.primary }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>International Language Competency (Advance 2)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startILCSession('A*')} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:18, backgroundColor: colors.primary }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>International Language Competency (A*)</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
        <PrimaryButton title="Back to Login" onPress={() => navigation.replace('AdminLogin')} style={{ alignSelf: 'flex-start' }} />
      </View>
    </GradientScreen>
  );
}
