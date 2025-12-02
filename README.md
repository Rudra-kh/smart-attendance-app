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

## 📸 App Screenshots

<table>
  <tr>
    <td align="center">
      <strong>Welcome Screen</strong><br>
      <em>Clean, modern onboarding</em>
    </td>
    <td align="center">
      <strong>Admin Dashboard</strong><br>
      <em>Session management hub</em>
    </td>
    <td align="center">
      <strong>QR Session</strong><br>
      <em>Dynamic QR generation</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>Student Panel</strong><br>
      <em>Tab-based navigation</em>
    </td>
    <td align="center">
      <strong>Attendance View</strong><br>
      <em>Subject-wise tracking</em>
    </td>
    <td align="center">
      <strong>About Developers</strong><br>
      <em>3D carousel showcase</em>
    </td>
  </tr>
</table>

---

## 🏗️ Architecture

```
smart-attendance/
├── App.js                    # Navigation setup
├── src/
│   ├── screens/              # All app screens
│   │   ├── SplashScreen.js
│   │   ├── WelcomeScreen.js
│   │   ├── AdminLoginScreen.js
│   │   ├── AdminDashboardScreen.js
│   │   ├── QRSessionScreen.js
│   │   ├── StudentPanelScreen.js
│   │   ├── tabs/             # Bottom tab screens
│   │   └── ...
│   ├── components/ui/        # Reusable UI components
│   │   ├── GlassCard.js
│   │   ├── GradientScreen.js
│   │   ├── PrimaryButton.js
│   │   └── AnimatedTabBar.js
│   ├── lib/                  # Firebase & business logic
│   │   ├── firebase.js
│   │   ├── attendance.js
│   │   └── students.js
│   ├── data/                 # Static data & configs
│   └── theme/                # Colors & typography
├── server/                   # Node.js backend (optional)
└── assets/                   # Images & icons
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (LTS version recommended)
- **npm** or **yarn**
- **Expo Go** app on your mobile device
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/Rudra-kh/smart-attendance-app.git
cd smart-attendance-app/smart-attendance

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running the App

| Platform | Command |
|----------|---------|
| **Mobile (Expo Go)** | Scan QR code from terminal |
| **Web** | `npx expo start --web` |
| **Android Emulator** | `npx expo run:android` |
| **iOS Simulator** | `npx expo run:ios` |

---

## ⚙️ Configuration

### Demo Mode (No Firebase Required)
The app includes a demo mode for quick testing:

```json
// app.json
{
  "expo": {
    "extra": {
      "demoMode": true
    }
  }
}
```

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add a Web App to your project
3. Copy the config to `app.json`:

```json
{
  "expo": {
    "extra": {
      "demoMode": false,
      "firebase": {
        "apiKey": "your-api-key",
        "authDomain": "your-project.firebaseapp.com",
        "projectId": "your-project-id",
        "storageBucket": "your-project.appspot.com",
        "messagingSenderId": "123456789",
        "appId": "your-app-id"
      }
    }
  }
}
```

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

---

## 👥 Development Team

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Rudra-kh">
        <img src="smart-attendance/assets/developers/rudra.jpg" width="100" style="border-radius: 50%"><br>
        <strong>Rudra Khambhayata</strong>
      </a><br>
      <em>Lead Developer</em>
    </td>
    <td align="center">
      <a href="https://github.com/onkarr28">
        <img src="smart-attendance/assets/developers/onkar.jpg" width="100" style="border-radius: 50%"><br>
        <strong>Onkar Kokate</strong>
      </a><br>
      <em>Full Stack Developer</em>
    </td>
    <td align="center">
      <a href="https://github.com/priyanshusodhan">
        <img src="smart-attendance/assets/developers/priyanshu.jpg" width="100" style="border-radius: 50%"><br>
        <strong>Priyanshu Sodhan</strong>
      </a><br>
      <em>Backend Developer</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/Yamisindram1595">
        <img src="smart-attendance/assets/developers/yami.jpg" width="100" style="border-radius: 50%"><br>
        <strong>Yami Sindram</strong>
      </a><br>
      <em>UI/UX Designer</em>
    </td>
    <td align="center">
      <a href="https://github.com/aanyacloud">
        <img src="smart-attendance/assets/developers/aanya.jpg" width="100" style="border-radius: 50%"><br>
        <strong>Aanya Chandrakar</strong>
      </a><br>
      <em>QA & Testing Lead</em>
    </td>
    <td align="center">
      <img src="https://upload.wikimedia.org/wikipedia/en/3/38/IIIT_Naya_Raipur_Logo.png" width="100"><br>
      <strong>IIIT Naya Raipur</strong><br>
      <em>Institution</em>
    </td>
  </tr>
</table>

---

## 📄 Project Structure

| Directory | Purpose |
|-----------|---------|
| `smart-attendance/` | Main React Native Expo app |
| `smart-attendance/server/` | Optional Node.js backend for admin operations |
| `keys/` | Firebase service account keys (not committed) |
| `app logo/` | Logo assets and branding |

---

## 🔒 Security Notes

> ⚠️ **Important**: Never commit service account keys or sensitive credentials to the repository.

- Firebase Admin SDK keys should be stored securely
- Use environment variables for sensitive data
- Firestore security rules are defined in `firestore.rules`

---

## 📝 License

This project is developed as part of the IT Workshop course at IIIT Naya Raipur.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📬 Contact

For questions or support, reach out to any of the developers through their GitHub profiles or email addresses listed in the app's "About Developers" section.

---

<p align="center">
  <strong>⭐ Star this repository if you found it helpful!</strong>
</p>

<p align="center">
  Made with 💙 using React Native & Expo
</p>

