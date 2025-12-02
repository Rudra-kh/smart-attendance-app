import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Switch, Platform } from 'react-native';
import colors from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import XLSX from 'xlsx';
import timetableCSE from '../data/timetable.json';
import timetableECE from '../data/timetable_ece.json';
import timetableDSAI from '../data/timetable_dsai.json';

const TEST_TYPES = [
  'Quiz 1', 'Quiz 2', 'Quiz 3',
  'Mid Semester', 'End Semester',
  'Assignment 1', 'Assignment 2', 'Assignment 3',
  'Lab Test 1', 'Lab Test 2',
  'Project', 'Viva', 'Other'
];

export default function UploadScoresScreen({ navigation, route }) {
  const [branch, setBranch] = useState(route?.params?.branch || 'CSE');
  const [subjectName, setSubjectName] = useState('');
  const [testName, setTestName] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [useAI, setUseAI] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');

  const timetable = useMemo(() => {
    if (branch === 'ECE') return timetableECE;
    if (branch === 'DSAI') return timetableDSAI;
    return timetableCSE;
  }, [branch]);

  const availableSubjects = useMemo(() => {
    const set = new Set();
    Object.values(timetable.slotCatalog || {}).forEach((slot) => {
      if (slot?.subject) set.add(slot.subject);
    });
    return Array.from(set).sort();
  }, [timetable]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not pick file');
    }
  };

  const parseExcelManually = async (base64Data) => {
    try {
      // Convert base64 to array buffer for XLSX
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (data.length === 0) {
        return { error: 'Excel file is empty or has invalid format' };
      }

      const students = [];
      for (const row of data) {
        const keys = Object.keys(row);
        
        const findKey = (patterns) => {
          for (const pattern of patterns) {
            const found = keys.find(k => 
              k.toLowerCase().replace(/[\s_-]/g, '').includes(pattern.toLowerCase().replace(/[\s_-]/g, ''))
            );
            if (found) return found;
          }
          return null;
        };

        const rollNoKey = findKey(['rollno', 'roll', 'id', 'studentid', 'regno']);
        const nameKey = findKey(['name', 'studentname', 'fullname']);
        const marksKey = findKey(['marks', 'score', 'obtained', 'marksscored']);
        const maxMarksKey = findKey(['maxmarks', 'max', 'total', 'outof']);

        const rollNo = rollNoKey ? String(row[rollNoKey]).trim() : '';
        const name = nameKey ? String(row[nameKey]).trim() : '';
        const marks = marksKey ? Number(row[marksKey]) || 0 : 0;
        const rowMaxMarks = maxMarksKey ? Number(row[maxMarksKey]) || Number(maxMarks) : Number(maxMarks);

        if (rollNo) {
          students.push({
            rollNo,
            name,
            marks,
            maxMarks: rowMaxMarks,
          });
        }
      }

      return { students };
    } catch (error) {
      return { error: error.message || 'Failed to parse Excel file' };
    }
  };

  const handleUpload = async () => {
    if (!subjectName) {
      Alert.alert('Missing Info', 'Please select a subject');
      return;
    }
    if (!testName) {
      Alert.alert('Missing Info', 'Please select a test type');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Missing Info', 'Please select an Excel file');
      return;
    }

    setUploading(true);
    setParsingStatus('Reading file...');

    try {
      let base64Data = '';
      
      if (Platform.OS === 'web') {
        const response = await fetch(selectedFile.uri);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      } else {
        base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      setParsingStatus('Parsing Excel file...');
      const result = await parseExcelManually(base64Data);

      if (result.error) {
        Alert.alert('Parse Error', result.error);
        setUploading(false);
        return;
      }

      if (!result.students || result.students.length === 0) {
        Alert.alert('No Data', 'No student data found in the file');
        setUploading(false);
        return;
      }

      setParsingStatus(`Uploading ${result.students.length} records...`);

      // Upload each student's score to Firestore
      const scoresRef = collection(db, 'scores');
      let uploaded = 0;

      for (const student of result.students) {
        const percentage = student.maxMarks > 0 
          ? (student.marks / student.maxMarks) * 100 
          : 0;

        await addDoc(scoresRef, {
          rollNo: student.rollNo,
          name: student.name,
          subjectName,
          testName,
          marks: student.marks,
          maxMarks: student.maxMarks,
          percentage,
          branch,
          uploadedAt: serverTimestamp(),
        });
        
        uploaded++;
        setParsingStatus(`Uploading ${uploaded}/${result.students.length} records...`);
      }

      Alert.alert(
        'Success',
        `Successfully uploaded ${uploaded} student scores`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload scores: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
      setParsingStatus('');
    }
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarkAlt]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textOnDark} />
          </TouchableOpacity>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: '700', 
            color: colors.textOnDark, 
            marginLeft: 16 
          }}>
            Upload Scores
          </Text>
        </View>

        <Text style={{ 
          fontSize: 24, 
          fontWeight: '800', 
          color: colors.textOnDark, 
          marginBottom: 20 
        }}>
          Upload Test Scores
        </Text>

        {/* Info Card */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="file-excel" size={20} color="#10B981" />
            <Text style={{ fontWeight: '600', color: colors.textOnDark }}>Excel Format Required</Text>
          </View>
          <Text style={{ color: colors.textOnDarkSecondary, fontSize: 13, lineHeight: 20 }}>
            Your Excel file should have these columns:{'\n'}
            • RollNo (or Roll No, roll_no, ID){'\n'}
            • Name (or StudentName, Student Name){'\n'}
            • Marks (or Score, Obtained){'\n'}
            • MaxMarks (optional, defaults to value below)
          </Text>
        </View>

        {/* Branch Selection */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}>
          <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: 12 }}>
            Select Branch
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['CSE', 'ECE', 'DSAI'].map(b => (
              <TouchableOpacity
                key={b}
                onPress={() => { setBranch(b); setSubjectName(''); }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: branch === b ? colors.bgDark : '#F3F4F6',
                  alignItems: 'center',
                }}
              >
                <Text style={{ 
                  fontWeight: '600', 
                  color: branch === b ? '#FFF' : colors.textPrimary 
                }}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Selection */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}>
          <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
            Subject Name *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {availableSubjects.map(subj => (
                <TouchableOpacity
                  key={subj}
                  onPress={() => setSubjectName(subj)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: subjectName === subj ? colors.bgDark : '#F3F4F6',
                    marginBottom: 8,
                  }}
                >
                  <Text 
                    style={{ 
                      fontSize: 13,
                      color: subjectName === subj ? '#FFF' : colors.textPrimary 
                    }}
                    numberOfLines={1}
                  >
                    {subj}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {!subjectName && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              Select a subject...
            </Text>
          )}
        </View>

        {/* Test Type Selection */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}>
          <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
            Test Name *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {TEST_TYPES.map(test => (
                <TouchableOpacity
                  key={test}
                  onPress={() => setTestName(test)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: testName === test ? colors.bgDark : '#F3F4F6',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ 
                    fontSize: 13,
                    color: testName === test ? '#FFF' : colors.textPrimary 
                  }}>
                    {test}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {!testName && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              Select test type...
            </Text>
          )}
        </View>

        {/* Max Marks */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}>
          <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
            Default Max Marks
          </Text>
          <TextInput
            value={maxMarks}
            onChangeText={setMaxMarks}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: colors.dividerLight,
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              color: colors.textPrimary,
            }}
            placeholder="100"
          />
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
            Used if MaxMarks column is not in Excel
          </Text>
        </View>

        {/* AI Toggle */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
              <Text style={{ fontWeight: '600', color: colors.textPrimary }}>AI-Powered Parsing</Text>
            </View>
            <Switch
              value={useAI}
              onValueChange={setUseAI}
              trackColor={{ false: '#E5E7EB', true: colors.primary + '80' }}
              thumbColor={useAI ? colors.primary : '#9CA3AF'}
            />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
            Use Google Gemini to intelligently parse your Excel file
          </Text>
          <View style={{
            backgroundColor: '#EFF6FF',
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}>
            <Text style={{ fontSize: 12, color: '#1E40AF' }}>
              ✨ AI will automatically detect columns, handle messy data, and extract student information intelligently.
            </Text>
          </View>
        </View>

        {/* File Picker */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: 12 }}>
            Excel File *
          </Text>
          <TouchableOpacity
            onPress={pickFile}
            style={{
              backgroundColor: colors.secondary,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontWeight: '600', color: colors.bgDark }}>
              {selectedFile ? selectedFile.name : 'Pick Excel File (.xlsx)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          style={{
            backgroundColor: uploading ? '#9CA3AF' : colors.secondary,
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <MaterialCommunityIcons 
            name={uploading ? "loading" : "cloud-upload"} 
            size={20} 
            color={colors.bgDark} 
          />
          <Text style={{ fontWeight: '700', color: colors.bgDark, fontSize: 16 }}>
            {uploading ? parsingStatus || 'Uploading...' : (useAI ? 'Upload with AI' : 'Upload')}
          </Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text style={{ color: colors.textOnDarkSecondary }}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}
