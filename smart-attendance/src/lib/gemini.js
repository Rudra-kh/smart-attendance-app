/**
 * Gemini AI Integration for Smart Attendance App
 * Used for intelligent Excel parsing of student scores
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

// Get API key from Expo config
const extras = Constants?.expoConfig?.extra || {};
const GEMINI_API_KEY = extras.geminiApiKey || '';

let genAI = null;
let model = null;

/**
 * Initialize the Gemini AI client
 */
function initializeGemini() {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured. AI parsing will not work.');
    return false;
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return true;
}

/**
 * Check if Gemini is available and configured
 */
export function isGeminiAvailable() {
  return !!GEMINI_API_KEY;
}

/**
 * Parse Excel data using Gemini AI
 * @param {Array} rawData - Raw JSON data from Excel parsing
 * @param {number} defaultMaxMarks - Default max marks if not found
 * @returns {Promise<{students: Array, error?: string}>}
 */
export async function parseExcelWithAI(rawData, defaultMaxMarks = 100) {
  if (!initializeGemini()) {
    return { error: 'Gemini API key not configured. Please add your API key in app.json.' };
  }

  if (!rawData || rawData.length === 0) {
    return { error: 'No data to parse' };
  }

  try {
    // Take first 5 rows as sample for AI to understand structure
    const sampleData = rawData.slice(0, Math.min(5, rawData.length));
    const allKeys = Object.keys(rawData[0] || {});
    
    const prompt = `You are an expert data parser. Analyze this Excel data and extract student information.

INPUT DATA STRUCTURE:
Available columns: ${JSON.stringify(allKeys)}

Sample rows (first ${sampleData.length} of ${rawData.length} total):
${JSON.stringify(sampleData, null, 2)}

TASK:
1. Identify which column contains Roll Number/Student ID (could be: roll, rollno, roll_no, id, student_id, regno, enrollment, etc.)
2. Identify which column contains Student Name (could be: name, student_name, fullname, student, etc.)
3. Identify which column contains Marks/Score (could be: marks, score, obtained, marks_obtained, total, etc.)
4. Identify which column contains Max Marks if present (could be: max_marks, maxmarks, out_of, total_marks, max, etc.)

RESPOND WITH ONLY A VALID JSON OBJECT (no markdown, no explanation):
{
  "rollNoColumn": "exact_column_name_or_null",
  "nameColumn": "exact_column_name_or_null", 
  "marksColumn": "exact_column_name_or_null",
  "maxMarksColumn": "exact_column_name_or_null_if_not_found",
  "confidence": "high|medium|low",
  "notes": "brief notes about data quality"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let columnMapping;
    try {
      columnMapping = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', text);
      return { error: 'AI returned invalid response. Please try manual parsing.' };
    }

    // Validate that we found at least roll number and marks
    if (!columnMapping.rollNoColumn && !columnMapping.marksColumn) {
      return { 
        error: 'AI could not identify required columns (Roll No and Marks). Please check your Excel format.',
        aiNotes: columnMapping.notes 
      };
    }

    // Extract students using AI-identified columns
    const students = [];
    for (const row of rawData) {
      const rollNo = columnMapping.rollNoColumn 
        ? String(row[columnMapping.rollNoColumn] || '').trim() 
        : '';
      const name = columnMapping.nameColumn 
        ? String(row[columnMapping.nameColumn] || '').trim() 
        : '';
      const marks = columnMapping.marksColumn 
        ? parseFloat(row[columnMapping.marksColumn]) || 0 
        : 0;
      const maxMarks = columnMapping.maxMarksColumn 
        ? parseFloat(row[columnMapping.maxMarksColumn]) || defaultMaxMarks 
        : defaultMaxMarks;

      // Only add if we have a valid roll number
      if (rollNo && rollNo !== 'undefined' && rollNo !== 'null') {
        students.push({
          rollNo,
          name,
          marks,
          maxMarks,
        });
      }
    }

    if (students.length === 0) {
      return { 
        error: 'No valid student records found after AI parsing.',
        aiNotes: columnMapping.notes 
      };
    }

    return { 
      students,
      columnMapping,
      confidence: columnMapping.confidence,
      aiNotes: columnMapping.notes
    };

  } catch (error) {
    console.error('Gemini AI error:', error);
    return { 
      error: `AI parsing failed: ${error.message || 'Unknown error'}. Try disabling AI parsing.` 
    };
  }
}

/**
 * Validate and clean student data using AI
 * @param {Array} students - Array of student objects
 * @returns {Promise<{students: Array, corrections: Array}>}
 */
export async function validateStudentData(students) {
  if (!initializeGemini() || students.length === 0) {
    return { students, corrections: [] };
  }

  // For small datasets, skip AI validation
  if (students.length <= 3) {
    return { students, corrections: [] };
  }

  try {
    const sampleStudents = students.slice(0, Math.min(10, students.length));
    
    const prompt = `Analyze these student records for data quality issues:
${JSON.stringify(sampleStudents, null, 2)}

Look for:
1. Inconsistent roll number formats
2. Names that look like they might be swapped with roll numbers
3. Marks that seem unrealistic (negative, above max, etc.)
4. Any obvious data entry errors

Respond with ONLY a valid JSON object:
{
  "hasIssues": true/false,
  "issues": ["list of issues found"],
  "suggestions": ["list of suggestions"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const validation = JSON.parse(text);
    return { 
      students, 
      corrections: validation.issues || [],
      suggestions: validation.suggestions || []
    };
  } catch (error) {
    console.error('Validation error:', error);
    return { students, corrections: [] };
  }
}
