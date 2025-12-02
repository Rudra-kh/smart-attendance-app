import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import colors from '../../theme/colors';
import { listSessions, listAttendance } from '../../lib/attendance';
import languageGroups from '../../data/languageGroups.json';

export default function AttendanceTab({ navigation, student }) {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to check if a subject is ILC
  const isILCSession = (subjectName) => {
    return String(subjectName || '').toLowerCase().includes('international language competency');
  };

  // Helper to extract language group from subject name
  const extractLangGroup = (subject) => {
    const lower = String(subject || '').toLowerCase();
    if (!lower.includes('international language competency')) return null;
    if (lower.includes('basic')) return 'Basic';
    if (lower.includes('advance 2') || lower.includes('advance2') || lower.includes('advanced 2')) return 'Advance2';
    if (lower.includes('advance 1') || lower.includes('advance1') || lower.includes('advanced 1')) return 'Advance1';
    if (lower.includes('a*')) return 'A*';
    return null;
  };

  // Helper to get all students in a language group (global)
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

  const fetchAttendance = async () => {
    if (!student?.id || !student?.branch) return;
    
    try {
      const sessions = await listSessions({ pageSize: 200 });
      
      // Get student's ILC group memberships
      const studentILCGroups = [];
      ['Basic', 'Advance1', 'Advance2', 'A*'].forEach(grp => {
        const allowed = getGlobalILCGroup(grp);
        if (allowed.includes(String(student.id))) {
          studentILCGroups.push(grp);
        }
      });
      
      // Filter sessions: include branch sessions AND ILC sessions for student's groups
      const relevantSessions = sessions.filter(s => {
        const sessionBranch = s.branch || '';
        
        // Include sessions matching student's branch
        if (sessionBranch === student.branch) return true;
        
        // Include ILC sessions if student is in that language group
        if (isILCSession(s.subjectName)) {
          const grp = extractLangGroup(s.subjectName);
          if (grp && studentILCGroups.includes(grp)) return true;
        }
        
        return false;
      });
      
      const bySubject = new Map();
      relevantSessions.forEach(s => {
        const subj = String(s.subjectName || 'Unknown');
        const cur = bySubject.get(subj) || { subjectName: subj, attended: 0, total: 0 };
        cur.total += 1;
        bySubject.set(subj, cur);
      });
      
      const lists = await Promise.all(relevantSessions.map(s => listAttendance(s.id)));
      lists.forEach((list, idx) => {
        const s = relevantSessions[idx];
        const subj = String(s.subjectName || 'Unknown');
        const cur = bySubject.get(subj) || { subjectName: subj, attended: 0, total: 0 };
        const present = Array.isArray(list) && list.some(a => String(a.userId) === String(student.id));
        if (present) cur.attended += 1;
        bySubject.set(subj, cur);
      });
      
      const arr = Array.from(bySubject.values());
      arr.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      setSummary(arr);
    } catch (e) {
      console.error('Error fetching attendance:', e);
      setSummary([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [student?.id, student?.branch]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  // Calculate overall attendance
  const overallStats = useMemo(() => {
    const totalAttended = summary.reduce((sum, s) => sum + s.attended, 0);
    const totalClasses = summary.reduce((sum, s) => sum + s.total, 0);
    const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    return { totalAttended, totalClasses, percentage };
  }, [summary]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Overall Stats Card */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
          Overall Attendance
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text style={{ 
            fontSize: 48, 
            fontWeight: '800', 
            color: overallStats.percentage >= 75 ? colors.success : colors.danger 
          }}>
            {overallStats.percentage}%
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 10 }}>
            ({overallStats.totalAttended}/{overallStats.totalClasses} classes)
          </Text>
        </View>
        <View style={{ 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: colors.dividerLight, 
          overflow: 'hidden',
          marginTop: 8 
        }}>
          <View style={{ 
            width: `${overallStats.percentage}%`, 
            height: '100%', 
            backgroundColor: overallStats.percentage >= 75 ? colors.success : colors.danger,
            borderRadius: 4
          }} />
        </View>
        {overallStats.percentage < 75 && (
          <Text style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>
            ⚠️ Below 75% minimum requirement
          </Text>
        )}
      </View>

      {/* Subject-wise Attendance */}
      <Text style={{ 
        fontSize: 18, 
        fontWeight: '700', 
        color: colors.textOnDark, 
        marginBottom: 12 
      }}>
        Subject-wise Attendance
      </Text>

      {loading ? (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Loading attendance...</Text>
        </View>
      ) : summary.length === 0 ? (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>No attendance records yet</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
            Your attendance will appear here
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {summary.map(item => {
            const pct = item.total === 0 ? 0 : Math.round((item.attended / item.total) * 100);
            const isLow = pct < 75;
            
            return (
              <TouchableOpacity
                key={item.subjectName}
                onPress={() => navigation.navigate('SubjectAttendance', { subjectName: item.subjectName })}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text 
                    style={{ flex: 1, fontWeight: '600', color: colors.textPrimary, fontSize: 15 }}
                    numberOfLines={1}
                  >
                    {item.subjectName}
                  </Text>
                  <View style={{ 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 12, 
                    backgroundColor: isLow ? '#FEE2E2' : '#DCFCE7' 
                  }}>
                    <Text style={{ 
                      color: isLow ? '#991B1B' : '#166534', 
                      fontWeight: '700',
                      fontSize: 14
                    }}>
                      {pct}%
                    </Text>
                  </View>
                </View>
                
                <View style={{ 
                  height: 6, 
                  borderRadius: 3, 
                  backgroundColor: colors.dividerLight, 
                  overflow: 'hidden' 
                }}>
                  <View style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    backgroundColor: isLow ? colors.danger : colors.success,
                    borderRadius: 3
                  }} />
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.attended}/{item.total} lectures attended
                  </Text>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    View Details →
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
