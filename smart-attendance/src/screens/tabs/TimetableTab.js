import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';
import timetableCSE from '../../data/timetable.json';
import timetableECE from '../../data/timetable_ece.json';
import timetableDSAI from '../../data/timetable_dsai.json';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Slot colors for visual distinction
const SLOT_COLORS = {
  'G': '#10B981', // Green
  'X': '#F59E0B', // Orange
  'E': '#6366F1', // Purple
  'V': '#EF4444', // Red
  'F': '#EC4899', // Pink
  'default': '#3B82F6', // Blue
};

export default function TimetableTab({ student }) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    // Sunday = 0, Monday = 1, etc.
    if (today >= 1 && today <= 5) return today - 1; // 0-indexed for Mon-Fri
    return 0; // Default to Monday on weekends
  });

  const timetable = useMemo(() => {
    if (student?.branch === 'ECE') return timetableECE;
    if (student?.branch === 'DSAI') return timetableDSAI;
    return timetableCSE;
  }, [student?.branch]);

  const todaySchedule = useMemo(() => {
    const dayName = DAY_NAMES[selectedDay];
    const day = timetable.days?.[dayName];
    if (!Array.isArray(day)) return [];

    const schedule = [];
    for (let i = 0; i < day.length; i++) {
      const cell = day[i];
      const timeSlot = timetable.timeColumns?.[i];
      
      if (!timeSlot) continue;
      
      const isBreak = timeSlot.type === 'break' || cell === 'BREAK';
      
      if (isBreak) {
        schedule.push({
          type: 'break',
          label: timeSlot.label || 'Break',
          start: timeSlot.start,
          end: timeSlot.end,
        });
        continue;
      }

      const codes = Array.isArray(cell) ? cell : cell ? [cell] : [];
      
      if (codes.length === 0) {
        schedule.push({
          type: 'free',
          label: 'Free Period',
          start: timeSlot.start,
          end: timeSlot.end,
        });
        continue;
      }

      codes.forEach(code => {
        const meta = timetable.slotCatalog?.[code];
        if (!meta) {
          schedule.push({
            type: 'class',
            code,
            subject: code,
            faculty: null,
            start: timeSlot.start,
            end: timeSlot.end,
          });
        } else {
          schedule.push({
            type: 'class',
            code,
            subject: meta.subject || code,
            faculty: meta.faculty || null,
            start: timeSlot.start,
            end: timeSlot.end,
          });
        }
      });
    }

    return schedule;
  }, [selectedDay, timetable]);

  // Check if today is the selected day
  const isToday = useMemo(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 5 && today - 1 === selectedDay;
  }, [selectedDay]);

  const getSlotColor = (code) => {
    if (!code) return SLOT_COLORS.default;
    const firstChar = code.charAt(0).toUpperCase();
    return SLOT_COLORS[firstChar] || SLOT_COLORS.default;
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Day selector */}
      <View style={{ 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        gap: 8,
      }}>
        {DAYS.map((day, idx) => {
          const today = new Date().getDay();
          const isTodayIndicator = today >= 1 && today <= 5 && today - 1 === idx;
          
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(idx)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: selectedDay === idx ? colors.bgDark : '#FFFFFF',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <Text style={{
                fontWeight: '600',
                color: selectedDay === idx ? '#FFF' : colors.textPrimary,
              }}>
                {day}
              </Text>
              {isTodayIndicator && (
                <View style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: selectedDay === idx ? '#10B981' : colors.primary,
                }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Schedule heading */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: '700', 
          color: colors.textOnDark 
        }}>
          {isToday ? "Today's" : DAY_NAMES[selectedDay] + "'s"} Schedule
        </Text>
      </View>

      {/* Schedule list */}
      <ScrollView 
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {todaySchedule.length === 0 ? (
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 40,
            alignItems: 'center',
          }}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No classes scheduled</Text>
          </View>
        ) : (
          todaySchedule.map((item, idx) => {
            if (item.type === 'break') {
              return (
                <View 
                  key={`break-${idx}`}
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FCD34D',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialCommunityIcons name="food" size={20} color="#92400E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#92400E' }}>{item.label}</Text>
                    <Text style={{ fontSize: 12, color: '#B45309' }}>
                      {item.start}-{item.end}
                    </Text>
                  </View>
                </View>
              );
            }

            if (item.type === 'free') {
              return (
                <View 
                  key={`free-${idx}`}
                  style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#6B7280" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#6B7280' }}>{item.label}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {item.start}-{item.end}
                    </Text>
                  </View>
                </View>
              );
            }

            // Class item
            const slotColor = getSlotColor(item.code);
            return (
              <View 
                key={`class-${idx}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: slotColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                    {item.code?.charAt(0) || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  {item.faculty && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MaterialCommunityIcons name="account" size={12} color={colors.textSecondary} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.faculty}</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '600', color: colors.textPrimary }}>{item.start}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.end}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* Tomorrow's schedule hint */}
        {isToday && selectedDay < 4 && (
          <TouchableOpacity
            onPress={() => setSelectedDay(selectedDay + 1)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            <View>
              <Text style={{ fontWeight: '600', color: colors.textOnDark }}>
                View Tomorrow's Schedule
              </Text>
              <Text style={{ fontSize: 12, color: colors.textOnDarkSecondary }}>
                Plan ahead for {DAY_NAMES[selectedDay + 1]}
              </Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={24} color={colors.textOnDark} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
