# MediQueue | Smart Hospital Queue Management System

A web-based hospital queue and appointment management platform featuring role-based dashboards (Patient, Doctor, Admin), live queue estimation, telemedicine video consultations for senior citizens (60+), and patient assistance.

🌐 **Live Demo:** [https://anujsinghrajput11.github.io/Queue-Management-System-/](https://anujsinghrajput11.github.io/Queue-Management-System-/)

---

## 🌟 Key Features

- **Role-Based Access:**
  - 👤 **Patient:** Book in-person or video appointments, check live token queues, view estimated wait times, view medical department directories, and request front desk help.
  - 🩺 **Doctor:** View scheduled appointments, call next patient in queue, mark consultations as completed, and conduct telemedicine video calls.
  - 🛡️ **Administrator:** Hospital overview statistics, doctor availability management, department analytics, and queue throughput reports.
- **📹 Video Care (60+):**
  - Dedicated telemedicine flow for senior citizens with simplified verification.
  - One-click browser-based video consultations powered by Jitsi Meet.
  - Accessibility toggle for large text mode.
- **⚡ Real-Time Simulated Queue:**
  - Dynamic token generation, queue sequence tracking, and estimated wait calculation based on doctor pace.
- **💾 Browser Persistence:**
  - Zero database installation required; full local prototype powered by `localStorage`.

---

## 🔑 Demo Login Credentials

For quick testing, click any of the **Demo** buttons on the login screen, or use the credentials below:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Patient** | `patient@demo.com` | `demo123` |
| **Doctor** | `doctor@demo.com` | `demo123` |
| **Admin** | `admin@demo.com` | `demo123` |

---

## 🚀 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/anujsinghrajput11/Queue-Management-System-.git
   ```
2. Open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
3. No build tools or backend dependencies needed.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern CSS3 (CSS Grid, Flexbox, Custom Properties)
- **Scripting:** Vanilla JavaScript (ES6+)
- **Video Calling:** Jitsi Meet API
- **Deployment:** GitHub Pages
