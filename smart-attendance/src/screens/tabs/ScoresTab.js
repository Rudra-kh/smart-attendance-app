import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ScoresTab({ student }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState(null);

  const fetchScores = async () => {
    if (!student?.id) return;
    
    try {
      const q = query(
        collection(db, 'scores'),
        where('rollNo', '==', String(student.id)),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setScores(data);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setScores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [student?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScores();
  };

  // Get unique subjects
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(scores.map(s => s.subjectName))];
    return uniqueSubjects;
  }, [scores]);

  // Filtered scores
  const filteredScores = useMemo(() => {
    if (filter === 'all' || !selectedSubject) return scores;
    return scores.filter(s => s.subjectName === selectedSubject);
  }, [scores, filter, selectedSubject]);

  // Stats
  const stats = useMemo(() => {
    if (scores.length === 0) return [];
    
    const result = [];
    
    // Average percentage
    const avg = scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length;
    result.push({
      label: 'Average',
      value: `${Math.round(avg)}%`,
      icon: 'chart-line',
      color: avg >= 60 ? '#10B981' : '#EF4444',
    });
    
    // Total tests
    result.push({
      label: 'Tests',
      value: scores.length,
      icon: 'file-document-multiple',
      color: '#6366F1',
    });
    
    // Best score
    if (scores.length > 0) {
      const best = Math.max(...scores.map(s => s.percentage || 0));
      result.push({
        label: 'Best',
        value: `${Math.round(best)}%`,
        icon: 'trophy',
        color: '#F59E0B',
      });
    }
    
    return result;
  }, [scores]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textOnDark }}>Loading scores...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textOnDark, marginBottom: 16 }}>
        All Test Scores
      </Text>

      {scores.length === 0 ? (
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 40,
          alignItems: 'center',
        }}>
          <MaterialCommunityIcons name="file-document-outline" size={60} color={colors.dividerLight} />
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: colors.textPrimary, 
            marginTop: 16 
          }}>
            No test scores yet
          </Text>
          <Text style={{ 
            color: colors.textSecondary, 
            textAlign: 'center', 
            marginTop: 8 
          }}>
            Your test scores will appear here once your teachers upload them
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              backgroundColor: colors.bgDark,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 20,
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Stats Row */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 10, 
            marginBottom: 16 
          }}>
            {stats.map((stat, idx) => (
              <View 
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons name={stat.icon} size={24} color={stat.color} />
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: '700', 
                  color: stat.color,
                  marginTop: 4 
                }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Subject filter */}
          {subjects.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <TouchableOpacity
                onPress={() => { setFilter('all'); setSelectedSubject(null); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: filter === 'all' ? colors.bgDark : '#FFFFFF',
                  marginRight: 8,
                }}
              >
                <Text style={{ 
                  color: filter === 'all' ? '#FFF' : colors.textPrimary,
                  fontWeight: '600',
                }}>
                  All
                </Text>
              </TouchableOpacity>
              {subjects.map(subj => (
                <TouchableOpacity
                  key={subj}
                  onPress={() => { setFilter('subject'); setSelectedSubject(subj); }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedSubject === subj ? colors.bgDark : '#FFFFFF',
                    marginRight: 8,
                  }}
                >
                  <Text 
                    style={{ 
                      color: selectedSubject === subj ? '#FFF' : colors.textPrimary,
                      fontWeight: '600',
                    }}
                    numberOfLines={1}
                  >
                    {subj}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Score Cards */}
          <View style={{ gap: 12 }}>
            {filteredScores.map(score => {
              const percentage = score.percentage || 0;
              const isGood = percentage >= 60;
              const uploadDate = score.uploadedAt?.toDate?.();
              const dateStr = uploadDate 
                ? uploadDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';

              return (
                <View 
                  key={score.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
                        {score.subjectName || 'Unknown Subject'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {score.testName || 'Test'}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isGood ? '#DCFCE7' : '#FEE2E2',
                    }}>
                      <Text style={{ 
                        fontWeight: '700', 
                        color: isGood ? '#166534' : '#991B1B',
                      }}>
                        {Math.round(percentage)}%
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: 12 
                  }}>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                      {score.marks}/{score.maxMarks} marks
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {dateStr}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={{ 
                    height: 6, 
                    borderRadius: 3, 
                    backgroundColor: colors.dividerLight, 
                    marginTop: 10,
                    overflow: 'hidden',
                  }}>
                    <View style={{ 
                      width: `${percentage}%`, 
                      height: '100%', 
                      backgroundColor: isGood ? '#10B981' : '#EF4444',
                      borderRadius: 3,
                    }} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
