import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';
import colors from '../theme/colors';

export default function MyScoresScreen({ navigation }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'subject'
  const [selectedSubject, setSelectedSubject] = useState(null);

  const fetchScores = async (rollNo) => {
    try {
      if (!db) {
        console.warn('Firebase not initialized');
        return [];
      }
      
      const q = query(
        collection(db, 'scores'),
        where('rollNo', '==', String(rollNo))
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by upload date (newest first)
      data.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate?.() || new Date(0);
        const dateB = b.uploadedAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching scores:', error);
      return [];
    }
  };

  const loadData = async () => {
    try {
      const auth = await AsyncStorage.getItem('demo:studentAuth');
      if (!auth) {
        navigation.replace('StudentLogin');
        return;
      }
      
      const { rollNo, name } = JSON.parse(auth);
      setStudentName(name);
      setStudentId(rollNo);
      
      const data = await fetchScores(rollNo);
      setScores(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Get unique subjects for filtering
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(scores.map(s => s.subjectName))];
    return uniqueSubjects.sort();
  }, [scores]);

  // Filtered scores
  const filteredScores = useMemo(() => {
    if (filter === 'all' || !selectedSubject) return scores;
    return scores.filter(s => s.subjectName === selectedSubject);
  }, [scores, filter, selectedSubject]);

  // AI Insights generator
  const getInsights = useMemo(() => {
    if (scores.length === 0) return [];
    
    const insights = [];
    
    // Calculate overall average
    const avg = scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length;
    
    if (avg >= 80) {
      insights.push({ 
        icon: '🌟', 
        text: `Excellent performance! Your average is ${avg.toFixed(1)}%`, 
        type: 'success' 
      });
    } else if (avg >= 60) {
      insights.push({ 
        icon: '📈', 
        text: `Good progress! Your average is ${avg.toFixed(1)}%`, 
        type: 'info' 
      });
    } else if (avg >= 40) {
      insights.push({ 
        icon: '💪', 
        text: `Keep working! Your average is ${avg.toFixed(1)}%`, 
        type: 'warning' 
      });
    } else {
      insights.push({ 
        icon: '📚', 
        text: `Needs improvement. Average: ${avg.toFixed(1)}%`, 
        type: 'danger' 
      });
    }
    
    // Best and worst performance
    if (scores.length > 1) {
      const sorted = [...scores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      
      insights.push({ 
        icon: '🏆', 
        text: `Best: ${best.testName} in ${best.subjectName} (${best.percentage}%)`,
        type: 'success'
      });
      
      if (worst.percentage < 50 && worst !== best) {
        insights.push({ 
          icon: '⚠️', 
          text: `Focus on: ${worst.subjectName} - ${worst.testName} (${worst.percentage}%)`,
          type: 'warning'
        });
      }
    }

    // Subject-wise analysis
    const subjectAvg = {};
    scores.forEach(s => {
      if (!subjectAvg[s.subjectName]) {
        subjectAvg[s.subjectName] = { total: 0, count: 0 };
      }
      subjectAvg[s.subjectName].total += s.percentage || 0;
      subjectAvg[s.subjectName].count += 1;
    });

    // Find weakest subject
    let weakestSubject = null;
    let weakestAvg = 100;
    Object.entries(subjectAvg).forEach(([subj, data]) => {
      const avg = data.total / data.count;
      if (avg < weakestAvg && data.count >= 1) {
        weakestAvg = avg;
        weakestSubject = subj;
      }
    });

    if (weakestSubject && weakestAvg < 60) {
      insights.push({ 
        icon: '📖', 
        text: `Spend more time on ${weakestSubject} (avg: ${weakestAvg.toFixed(0)}%)`,
        type: 'info'
      });
    }

    // Trend analysis (if multiple tests)
    if (scores.length >= 3) {
      const recentScores = scores.slice(0, 3);
      const recentAvg = recentScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / 3;
      const olderScores = scores.slice(3);
      
      if (olderScores.length > 0) {
        const olderAvg = olderScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / olderScores.length;
        
        if (recentAvg > olderAvg + 5) {
          insights.push({ 
            icon: '📈', 
            text: `Great! Your recent scores are improving (+${(recentAvg - olderAvg).toFixed(0)}%)`,
            type: 'success'
          });
        } else if (recentAvg < olderAvg - 5) {
          insights.push({ 
            icon: '📉', 
            text: `Your recent scores have dropped. Stay focused!`,
            type: 'warning'
          });
        }
      }
    }
    
    return insights;
  }, [scores]);

  const getInsightBgColor = (type) => {
    switch (type) {
      case 'success': return 'rgba(34, 197, 94, 0.15)';
      case 'warning': return 'rgba(245, 158, 11, 0.15)';
      case 'danger': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(59, 130, 246, 0.15)';
    }
  };

  const getInsightTextColor = (type) => {
    switch (type) {
      case 'success': return '#22C55E';
      case 'warning': return '#F59E0B';
      case 'danger': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  return (
    <GradientScreen>
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textOnDark }}>
            My Scores
          </Text>
          <Text style={{ color: colors.textOnDarkSecondary, marginTop: 4 }}>
            {studentName} • {studentId}
          </Text>
        </View>

        {/* AI Insights Card */}
        {scores.length > 0 && getInsights.length > 0 && (
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>🤖</Text>
              <Text style={{ fontWeight: '700', color: colors.textPrimary, fontSize: 16 }}>
                AI Insights
              </Text>
            </View>
            
            {getInsights.map((insight, idx) => (
              <View 
                key={idx} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'flex-start', 
                  marginVertical: 4,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: getInsightBgColor(insight.type)
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>{insight.icon}</Text>
                <Text style={{ 
                  color: getInsightTextColor(insight.type),
                  flex: 1,
                  lineHeight: 20
                }}>
                  {insight.text}
                </Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Subject Filter */}
        {subjects.length > 1 && (
          <GlassCard>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', marginBottom: 10 }}>
              Filter by Subject
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => { setFilter('all'); setSelectedSubject(null); }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: filter === 'all' ? colors.primary : colors.bgLight,
                    borderWidth: 1,
                    borderColor: filter === 'all' ? colors.primary : colors.dividerLight
                  }}
                >
                  <Text style={{ 
                    color: filter === 'all' ? '#fff' : colors.textSecondary,
                    fontWeight: '600',
                    fontSize: 13
                  }}>
                    All
                  </Text>
                </TouchableOpacity>
                
                {subjects.map(subj => (
                  <TouchableOpacity
                    key={subj}
                    onPress={() => { setFilter('subject'); setSelectedSubject(subj); }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      backgroundColor: selectedSubject === subj ? colors.primary : colors.bgLight,
                      borderWidth: 1,
                      borderColor: selectedSubject === subj ? colors.primary : colors.dividerLight
                    }}
                  >
                    <Text 
                      style={{ 
                        color: selectedSubject === subj ? '#fff' : colors.textSecondary,
                        fontWeight: '600',
                        fontSize: 13
                      }}
                      numberOfLines={1}
                    >
                      {subj.length > 15 ? subj.substring(0, 15) + '...' : subj}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </GlassCard>
        )}

        {/* Scores List */}
        {loading ? (
          <GlassCard>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Loading scores...
            </Text>
          </GlassCard>
        ) : scores.length === 0 ? (
          <GlassCard>
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📝</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 16 }}>
                No test scores yet
              </Text>
              <Text style={{ 
                color: colors.textSecondary, 
                textAlign: 'center', 
                fontSize: 13, 
                marginTop: 8 
              }}>
                Your scores will appear here once your teachers upload them.
              </Text>
              <Text style={{ 
                color: colors.textSecondary, 
                textAlign: 'center', 
                fontSize: 12, 
                marginTop: 12 
              }}>
                Pull down to refresh
              </Text>
            </View>
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ 
              color: colors.textOnDarkSecondary, 
              fontSize: 13,
              marginBottom: 4
            }}>
              Showing {filteredScores.length} of {scores.length} results
            </Text>
            
            {filteredScores.map((score, idx) => {
              const pct = score.percentage || 0;
              const chipBg = pct >= 80 ? '#DCFCE7' : pct >= 60 ? '#FEF3C7' : pct >= 40 ? '#FFEDD5' : '#FEE2E2';
              const chipFg = pct >= 80 ? '#166534' : pct >= 60 ? '#92400E' : pct >= 40 ? '#9A3412' : '#991B1B';
              const barColor = pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#F97316' : '#EF4444';
              
              const uploadDate = score.uploadedAt?.toDate?.();
              const dateStr = uploadDate 
                ? uploadDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';
              
              return (
                <GlassCard key={score.id || idx}>
                  <View style={{ gap: 10 }}>
                    {/* Header: Subject & Percentage */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text 
                          style={{ fontWeight: '700', color: colors.textPrimary, fontSize: 16 }}
                          numberOfLines={1}
                        >
                          {score.subjectName}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                          {score.testName}
                        </Text>
                      </View>
                      <View style={{ 
                        paddingVertical: 6, 
                        paddingHorizontal: 12, 
                        borderRadius: 14, 
                        backgroundColor: chipBg 
                      }}>
                        <Text style={{ color: chipFg, fontWeight: '800', fontSize: 15 }}>
                          {pct}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={{ 
                      height: 8, 
                      borderRadius: 4, 
                      backgroundColor: colors.dividerLight, 
                      overflow: 'hidden' 
                    }}>
                      <View style={{ 
                        width: `${Math.min(Math.max(pct, 0), 100)}%`, 
                        height: '100%', 
                        backgroundColor: barColor,
                        borderRadius: 4
                      }} />
                    </View>
                    
                    {/* Score Details */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
                        {score.marks} / {score.maxMarks}
                      </Text>
                      {dateStr && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {dateStr}
                        </Text>
                      )}
                    </View>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* Back Button */}
        <View style={{ marginTop: 16 }}>
          <PrimaryButton 
            title="← Back to Panel" 
            onPress={() => navigation.goBack()} 
            variant="secondary" 
          />
        </View>
      </ScrollView>
    </GradientScreen>
  );
}
