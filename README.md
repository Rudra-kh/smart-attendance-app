<p align="center">
  <img src="smart-attendance/assets/icon.png" alt="Smart Attendance Logo" width="120" height="120" style="border-radius: 20px;">
</p>

<h1 align="center">📱 Smart Attendance App</h1>

<p align="center">
  <strong>A modern, QR-based attendance management system for educational institutions</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React Native">
  <img src="https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/Firebase-12.5-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-green?style=for-the-badge" alt="Platform">
</p>

<p align="center">
  <em>Built with ❤️ by students of IIIT Naya Raipur</em>
</p>

---

## 🎯 Overview

**Smart Attendance** is a comprehensive attendance management solution that revolutionizes how educational institutions track student attendance. Using dynamic QR codes with rotating tokens, the app ensures secure, real-time attendance marking while preventing proxy attendance.

<p align="center">
  <img src="smart-attendance/assets/splash-icon.png" alt="App Preview" width="200">
</p>

---

## ✨ Key Features

### 🔐 **For Administrators/Teachers**
| Feature | Description |
|---------|-------------|
| **Secure Login** | Password-protected admin access |
| **Branch Selection** | Support for multiple departments (ECE, DSAI, etc.) |
| **QR Session Management** | Create, monitor, and end attendance sessions |
| **Dynamic QR Codes** | Auto-rotating tokens for enhanced security |
| **Real-time Dashboard** | Live attendance count and session statistics |
| **Score Upload** | Upload and manage student scores via Excel |
| **Subject-wise Reports** | Detailed attendance reports per subject |

### 📲 **For Students**
| Feature | Description |
|---------|-------------|
| **Easy Login** | Roll number-based authentication |
| **QR Scanner** | Quick attendance marking via camera |
| **Attendance History** | View personal attendance records |
| **Timetable View** | Check class schedules |
| **Score Tracking** | View uploaded scores and grades |
| **Subject Analytics** | Track attendance percentage per subject |

### 🛡️ **Security Features**
- **Token Rotation**: QR codes refresh periodically to prevent screenshots
- **Session TTL**: Auto-expiring sessions
- **Firebase Authentication**: Secure cloud-based auth
- **Firestore Rules**: Granular access control

---

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center"><img src="https://reactnative.dev/img/header_logo.svg" width="40"><br><strong>React Native</strong></td>
    <td align="center"><img src="https://www.vectorlogo.zone/logos/expoio/expoio-icon.svg" width="40"><br><strong>Expo</strong></td>
    <td align="center"><img src="https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg" width="40"><br><strong>Firebase</strong></td>
    <td align="center"><img src="https://reactnavigation.org/img/spiro.svg" width="40"><br><strong>React Navigation</strong></td>
  </tr>
</table>

### Dependencies Highlights
- **expo-camera** - QR code scanning
- **react-native-qrcode-svg** - QR code generation
- **react-native-reanimated** - Smooth animations
- **expo-linear-gradient** - Beautiful gradients
- **xlsx** - Excel file processing
- **@google/generative-ai** - AI-powered Excel parsing with Gemini

---

## 📄 Project Structure

| Directory | Purpose |
|-----------|---------|
| `smart-attendance/` | Main React Native Expo app |
| `smart-attendance/server/` | Optional Node.js backend for admin operations |
| `keys/` | Firebase service account keys (not committed) |
| `app logo/` | Logo assets and branding |

---

<p align="center">
  <strong>⭐ Star this repository if you found it helpful!</strong>
</p>

<p align="center">
  Made with 💙 using React Native & Expo
</p>

