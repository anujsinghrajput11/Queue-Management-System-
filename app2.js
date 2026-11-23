"use strict";

/* MediQueue — college project prototype.
   Uses localStorage for demo data only.
   Do not use for real patient records. */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const DATA_KEY = "mediqueue_demo_v1";
const SESSION_KEY = "mediqueue_session_v1";

const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const initialData = {
  users: [
    { id: "u-patient", name: "Aarav Mehta", email: "patient@demo.com", password: "demo123", role: "patient" },
    { id: "u-doctor", name: "Dr. Priya Sharma", email: "doctor@demo.com", password: "demo123", role: "doctor" },
    { id: "u-admin", name: "Hospital Admin", email: "admin@demo.com", password: "demo123", role: "admin" }
  ],

  doctors: [
    { id: "d1", name: "Dr. Priya Sharma", specialty: "Cardiology", department: "Cardiology", room: "Room 204", experience: "8 years", available: true, avgMinutes: 10 },
    { id: "d2", name: "Dr. Rahul Verma", specialty: "Dermatology", department: "Dermatology", room: "Room 108", experience: "6 years", available: true, avgMinutes: 12 },
    { id: "d3", name: "Dr. Neha Kapoor", specialty: "General Physician", department: "General Medicine", room: "Room 101", experience: "10 years", available: true, avgMinutes: 8 },
    { id: "d4", name: "Dr. Arjun Malhotra", specialty: "Orthopedics", department: "Orthopedics", room: "Room 305", experience: "7 years", available: true, avgMinutes: 12 },
    { id: "d5", name: "Dr. Meera Kapoor", specialty: "Pediatrics", department: "Pediatrics", room: "Room 112", experience: "9 years", available: true, avgMinutes: 10 },
    { id: "d6", name: "Dr. Kabir Shah", specialty: "ENT Specialist", department: "ENT", room: "Room 207", experience: "5 years", available: true, avgMinutes: 10 },
    { id: "d7", name: "Dr. Aman Gupta", specialty: "Neurology", department: "Neurology", room: "Room 210", experience: "7 years", available: true, avgMinutes: 12 },
    { id: "d8", name: "Dr. Sneha Verma", specialty: "Gynecology", department: "Gynecology", room: "Room 115", experience: "9 years", available: true, avgMinutes: 10 },
    { id: "d9", name: "Dr. Karan Mehta", specialty: "Ophthalmology", department: "Eye Care", room: "Room 220", experience: "6 years", available: true, avgMinutes: 10 },
    { id: "d10", name: "Dr. Ananya Rao", specialty: "Psychiatry", department: "Mental Health", room: "Room 130", experience: "8 years", available: true, avgMinutes: 15 },
    { id: "d11", name: "Dr. Vikram Singh", specialty: "Dentistry", department: "Dental Care", room: "Room 125", experience: "5 years", available: true, avgMinutes: 10 },
    { id: "d12", name: "Dr. Pooja Nair", specialty: "Oncology", department: "Cancer Care", room: "Room 310", experience: "11 years", available: true, avgMinutes: 15 },
    { id: "d13", name: "Dr. Rohan Das", specialty: "Pulmonology", department: "Respiratory Care", room: "Room 215", experience: "7 years", available: true, avgMinutes: 12 },
    { id: "d14", name: "Dr. Isha Malhotra", specialty: "Endocrinology", department: "Hormone and Diabetes Care", room: "Room 140", experience: "6 years", available: true, avgMinutes: 12 },
    { id: "d15", name: "Dr. Sameer Joshi", specialty: "Gastroenterology", department: "Digestive Health", room: "Room 230", experience: "10 years", available: true, avgMinutes: 12 }
  ],

  appointments: [],
  videoConsults: [],
  notifications: []
};

function loadData() {
  try {
    const saved = localStorage.getItem(DATA_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      parsed.users ||= [...initialData.users];
      parsed.doctors ||= [];
      parsed.appointments ||= [];
      parsed.notifications ||= [];
      parsed.videoConsults ||= [];

      // Add new doctors to saved data without deleting appointments.
      const existingIds = new Set(parsed.doctors.map(d => d.id));

      initialData.doctors.forEach(d => {
        if (!existingIds.has(d.id)) {
          parsed.doctors.push({ ...d });
        }
      });

      localStorage.setItem(DATA_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (error) {
    console.warn("Unable to load saved demo data.", error);
  }

  const fresh = JSON.parse(JSON.stringify(initialData));
  localStorage.setItem(DATA_KEY, JSON.stringify(fresh));
  return fresh;
}

let data = loadData();
let currentUser = null;
let currentPage = "overview";
let authMode = "login";
let toastTimer;

const titles = {
  overview: "Overview",
  appointments: "Appointments",
  book: "Book appointment",
  queue: "Live queue",
  patients: "Patient list",
  doctors: "Doctors & services",
  reports: "Reports",
  video: "Video care (60+)",
  settings: "Settings"
};

function saveData() {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function safe(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function dateText(value) {
  if (!value) return "—";

  return new Date(value + "T12:00:00").toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

function timeText(value) {
  if (!value) return "—";

  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);

  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function toast(message) {
  const el = $("#toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2800);
}

function doctorFor(id) {
  return data.doctors.find(d => d.id === id);
}

function ownDoctor() {
  return data.doctors.find(d => d.name === currentUser?.name) ||
    (currentUser?.role === "doctor" ? data.doctors[0] : null);
}

function myAppointments() {
  if (currentUser.role === "patient") {
    return data.appointments.filter(a => a.patientId === currentUser.id);
  }

  if (currentUser.role === "doctor") {
    return data.appointments.filter(
      a => a.doctorId === (ownDoctor()?.id || "d1")
    );
  }

  return data.appointments;
}

function activeAppointments() {
  return data.appointments.filter(a =>
    !["completed", "cancelled", "skipped"].includes(a.status)
  );
}

function statusHTML(status) {
  const label = status === "serving"
    ? "Serving"
    : status.charAt(0).toUpperCase() + status.slice(1);

  return `<span class="status ${safe(status)}">${safe(label)}</span>`;
}

function positionInQueue(a) {
  if (!a || !["waiting", "booked", "called"].includes(a.status)) {
    return 0;
  }

  return data.appointments.filter(x =>
    x.id !== a.id &&
    x.doctorId === a.doctorId &&
    x.date === a.date &&
    ["waiting", "booked", "called"].includes(x.status) &&
    (
      x.time < a.time ||
      (x.time === a.time && x.createdAt < a.createdAt)
    )
  ).length + 1;
}

function waitMinutes(a) {
  if (!a) return 0;

  return Math.max(0, positionInQueue(a) - 1) *
    (doctorFor(a.doctorId)?.avgMinutes || 10);
}

function notify(userId, title, message) {
  data.notifications.push({
    id: "n-" + Date.now() + Math.random().toString(16).slice(2),
    userId,
    title,
    message,
    time: Date.now(),
    read: false
  });
}

function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
  $("#sidebar").classList.remove("open");
}

function loginAs(user) {
  currentUser = { ...user };
  localStorage.setItem(SESSION_KEY, user.id);
  currentPage = "overview";
  showApp();
}

/* LOGOUT FUNCTION */

function logout() {
  closeVideoCall();
  seniorDraft = null;
  seniorVerified = null;
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
  showAuth();
  authTab("login");
  toast("You have signed out.");
}

/* SIDEBAR LOGOUT BUTTON */

function addSidebarLogoutButton() {
  const sidebar = $("#sidebar");
  if (!sidebar || $("#sidebarLogoutBtn")) return;

  if (!$("#sidebarLogoutButtonStyle")) {
    const style = document.createElement("style");
    style.id = "sidebarLogoutButtonStyle";

    style.textContent = `
      #sidebar {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      #sidebarLogoutBtn {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        width: calc(100% - 40px);
        margin: auto 20px 18px;
        padding: 13px 16px;
        box-sizing: border-box;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 10px;
        background: rgba(255,255,255,.08);
        color: #fff;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }

      #sidebarLogoutBtn:hover {
        background: rgba(255,255,255,.17);
      }

      #sidebarLogoutBtn .logout-icon {
        font-size: 19px;
      }
    `;

    document.head.appendChild(style);
  }

  const button = document.createElement("button");
  button.id = "sidebarLogoutBtn";
  button.type = "button";
  button.innerHTML = `
    <span class="logout-icon">↪</span>
    <span>Logout</span>
  `;

  button.addEventListener("click", logout);
  sidebar.appendChild(button);
}

function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");

  addSidebarLogoutButton();

  const name = currentUser.name || "User";

  $("#sideName").textContent = name;
  $("#sideRole").textContent = currentUser.role + " account";
  $("#sideAvatar").textContent = name.charAt(0).toUpperCase();
  $("#topAvatar").textContent = name.charAt(0).toUpperCase();
  $("#topName").textContent = name.split(" ")[0];

  $$(".patient-only").forEach(el =>
    el.classList.toggle("hidden", currentUser.role !== "patient")
  );

  $$(".doctor-only").forEach(el =>
    el.classList.toggle("hidden", currentUser.role !== "doctor")
  );

  $$(".admin-only").forEach(el =>
    el.classList.toggle("hidden", currentUser.role !== "admin")
  );

  renderPage();
}

function authTab(mode) {
  authMode = mode;
  const registering = mode === "register";

  $("#loginTab").classList.toggle("active", !registering);
  $("#registerTab").classList.toggle("active", registering);
  $("#nameField").classList.toggle("hidden", !registering);
  $("#roleField").classList.toggle("hidden", !registering);

  $("#authTitle").textContent = registering
    ? "Create your account"
    : "Sign in to your account";

  $("#authSubtitle").textContent = registering
    ? "Get started with MediQueue."
    : "Manage your appointments in one place.";

  $("#authSubmit").innerHTML = registering
    ? "Create account <span>→</span>"
    : "Login <span>→</span>";
}

function heading(title, subtitle, actions = "") {
  return `<div class="page-heading">
    <div><h1>${title}</h1><p>${subtitle}</p></div>
    <div class="heading-actions">${actions}</div>
  </div>`;
}

function stat(label, value, icon, note = "") {
  return `<article class="stat-card">
    <div class="stat-top">
      <span>${label}</span>
      <span class="stat-icon">${icon}</span>
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-foot">${note}</div>
  </article>`;
}

function panel(title, body, action = "") {
  return `<section class="panel">
    <div class="panel-header"><h3>${title}</h3>${action}</div>
    <div class="panel-body">${body}</div>
  </section>`;
}

function empty(text) {
  return `<div class="empty-state">${text}</div>`;
}

function appointmentTable(list, staff = false) {
  if (!list.length) return empty("No appointments found.");

  return `<div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th>Token</th>
          ${staff ? "<th>Patient</th>" : "<th>Doctor</th>"}
          <th>Date</th>
          <th>Time</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(a => `<tr>
          <td><span class="token-pill">${safe(a.token)}</span></td>
          <td>${safe(staff ? a.patientName : a.doctorName)}</td>
          <td>${dateText(a.date)}</td>
          <td>${timeText(a.time)}</td>
          <td>${statusHTML(a.status)}</td>
          <td>
            <button class="btn secondary small" data-detail="${safe(a.id)}">
              Details
            </button>
          </td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

/* OVERVIEW */

function renderOverview() {
  const all = myAppointments();

  const active = all.filter(a =>
    !["completed", "cancelled", "skipped"].includes(a.status)
  );

  const next = active.slice().sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  )[0];

  const stats = `<div class="stats-grid">
    ${stat("Total appointments", all.length, "▣", "Your appointment records")}
    ${stat("Active appointments", active.length, "◷", "Not yet completed")}
    ${stat("Doctors available", data.doctors.filter(d => d.available).length, "✚", "In the demo directory")}
    ${stat("Completed visits", all.filter(a => a.status === "completed").length, "✓", "Visit history")}
  </div>`;

  const nextCard = next
    ? `<div class="queue-card">
        <div class="queue-label">YOUR NEXT APPOINTMENT</div>
        <div class="queue-token">${safe(next.token)}</div>
        <p>${safe(next.doctorName)} · ${safe(next.department)}</p>
        <p>${dateText(next.date)} at ${timeText(next.time)}</p>
        <p>Estimated wait: about ${waitMinutes(next)} minute(s)</p>
        <br>
        <button class="btn gold" data-detail="${safe(next.id)}">View details</button>
      </div>`
    : `<div class="queue-card">
        <div class="queue-label">WELCOME TO MEDIQUEUE</div>
        <p>No active appointment. Book an appointment to get started.</p>
        ${currentUser.role === "patient"
          ? '<br><button class="btn gold" data-go="book">Book appointment</button>'
          : ""}
      </div>`;

  const actions = `<div class="quick-actions">
    <button class="quick-action" data-go="book">
      <span>＋</span>
      <span><strong>Book appointment</strong><small>Choose a doctor and time</small></span>
    </button>
    <button class="quick-action" data-go="appointments">
      <span>▣</span>
      <span><strong>My appointments</strong><small>View your bookings</small></span>
    </button>
    <button class="quick-action" data-go="queue">
      <span>☷</span>
      <span><strong>Live queue</strong><small>Check queue positions</small></span>
    </button>
    <button class="quick-action" data-go="doctors">
      <span>✚</span>
      <span><strong>Doctors</strong><small>Explore services</small></span>
    </button>
  </div>`;

  return heading(
    "Welcome, " + safe(currentUser.name.split(" ")[0]) + "!",
    "Here is your MediQueue activity overview."
  ) + stats +
    `<div class="content-grid">
      <div>
        ${panel("Upcoming appointment", nextCard)}
        ${panel("Recent appointments", appointmentTable(all.slice(-5).reverse()))}
      </div>
      <div>
        ${panel("Quick actions", actions)}
        ${currentUser.role === "patient"
          ? panel("Video care for senior citizens (60+)",
              `<p class="muted">Age 60 or above? See the doctor from home by video call. This is a separate service from normal booking.</p>
               <br><button class="btn video" data-go="video">📹 Open Video care (60+)</button>`)
          : ""}
        ${panel("Helpful information",
          `<p class="muted">Arrive a little before your appointment time. Your token helps you follow the demo queue.</p>`
        )}
      </div>
    </div>`;
}

function renderAppointments() {
  const list = myAppointments().slice().sort((a, b) =>
    (b.date + b.time).localeCompare(a.date + a.time)
  );

  return heading(
    "Appointments",
    "View and manage your appointment records.",
    currentUser.role === "patient"
      ? '<button class="btn primary" data-go="book">＋ Book appointment</button>'
      : ""
  ) + panel(
    "Appointment history",
    appointmentTable(list, currentUser.role !== "patient")
  );
}

/* BOOK APPOINTMENT */

function renderBook() {
  if (currentUser.role !== "patient") {
    return heading(
      "Book appointment",
      "Appointment booking is available to patient accounts."
    ) + empty("Please sign in with a patient account to book.");
  }

  const doctors = data.doctors.filter(d => d.available);

  const consultationTypes = [
    "New consultation",
    "Follow-up visit",
    "Routine health check-up",
    "Preventive care",
    "Test or report review",
    "Vaccination",
    "Other"
  ];

  const reasons = [
    "Fever",
    "Headache or dizziness",
    "Cough, cold or sore throat",
    "Stomach or digestion problem",
    "Heart or blood pressure concern",
    "Skin problem or allergy",
    "Bone, muscle or joint pain",
    "Child health",
    "Women's health",
    "Eye problem",
    "Ear, nose or throat problem",
    "Dental problem",
    "Diabetes or hormone concern",
    "Mental wellness",
    "General health check-up",
    "Test or report review",
    "Other"
  ];

  return heading(
    "Book an appointment",
    "Select a doctor, consultation type, and reason for your visit."
  ) + `<section class="panel">
    <div class="panel-header"><h3>Appointment details</h3></div>
    <div class="panel-body">
      <form id="bookingForm">
        <div class="form-grid">
          <div class="field full-span">
            <label for="doctorSelect">Choose doctor *</label>
            <select id="doctorSelect" required>
              <option value="">Select a doctor</option>
              ${doctors.map(d =>
                `<option value="${safe(d.id)}">${safe(d.name)} — ${safe(d.specialty)} (${safe(d.room)})</option>`
              ).join("")}
            </select>
          </div>

          <div class="field">
            <label for="appointmentDate">Date *</label>
            <input id="appointmentDate" type="date" min="${today()}" value="${today()}" required>
          </div>

          <div class="field">
            <label for="appointmentTime">Time *</label>
            <select id="appointmentTime" required>
              ${["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30"].map(t =>
                `<option value="${t}">${timeText(t)}</option>`
              ).join("")}
            </select>
          </div>

          <div class="field">
            <label for="consultationType">Consultation type *</label>
            <select id="consultationType" required>
              <option value="">Select consultation type</option>
              ${consultationTypes.map(type =>
                `<option value="${safe(type)}">${safe(type)}</option>`
              ).join("")}
            </select>
          </div>

          <div class="field">
            <label for="appointmentReason">Why are you visiting? *</label>
            <select id="appointmentReason" required>
              <option value="">Select a reason</option>
              ${reasons.map(reason =>
                `<option value="${safe(reason)}">${safe(reason)}</option>`
              ).join("")}
            </select>
          </div>

          <div class="field full-span">
            <label for="consultationDetails">Additional details (optional)</label>
            <textarea id="consultationDetails" maxlength="500" rows="3" placeholder="Briefly describe your concern (optional)."></textarea>
          </div>
        </div>

        <br>
        <button class="btn primary" type="submit">Confirm appointment</button>
      </form>
    </div>
  </section>`;
}

/* LIVE QUEUE */

function renderQueue() {
  const list = activeAppointments().slice().sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  return heading(
    "Live queue",
    "Demo queue positions update when appointment status changes."
  ) + panel(
    "Current queue",
    list.length
      ? `<div class="table-wrap">
          <table class="queue-table">
            <thead>
              <tr>
                <th>Token</th><th>Patient</th><th>Doctor</th>
                <th>Time</th><th>Position</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(a => `<tr>
                <td><span class="token-pill">${safe(a.token)}</span></td>
                <td>${safe(a.patientName)}</td>
                <td>${safe(a.doctorName)}</td>
                <td>${timeText(a.time)}</td>
                <td>${positionInQueue(a) || "—"}</td>
                <td>${statusHTML(a.status)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`
      : empty("The queue is currently empty.")
  );
}

function renderPatients() {
  if (!["doctor", "admin"].includes(currentUser.role)) {
    return heading(
      "Patient list",
      "Patient list is available to staff accounts."
    ) + empty("Please sign in with a doctor or admin demo account.");
  }

  const list = activeAppointments();

  return heading(
    "Patient list",
    "Patients with active demo appointments."
  ) + panel(
    "Current patients",
    list.length
      ? `<div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Patient</th><th>Token</th><th>Doctor</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${list.map(a => `<tr>
                <td>${safe(a.patientName)}</td>
                <td>${safe(a.token)}</td>
                <td>${safe(a.doctorName)}</td>
                <td>${dateText(a.date)}</td>
                <td>${statusHTML(a.status)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`
      : empty("No active patients.")
  );
}

/* DOCTORS AND SERVICES */

function renderDoctors() {
  const list = data.doctors;

  const cards = list.map(d => `<article class="doctor-card">
    <div class="doctor-avatar">🩺</div>
    <h3>${safe(d.name)}</h3>
    <p>${safe(d.specialty)}</p>
    <p>Department: ${safe(d.department)}</p>
    <p>Room: ${safe(d.room)}</p>
    <p>Experience: ${safe(d.experience)}</p>
    <p>Status: ${d.available ? "Available" : "Unavailable"}</p>

    ${currentUser.role === "admin"
      ? `<button class="btn secondary small" data-toggle-doctor="${safe(d.id)}">${d.available ? "Mark unavailable" : "Mark available"}</button>`
      : ""}

    ${currentUser.role === "patient" && d.available
      ? `<button class="btn primary" data-book-doctor="${safe(d.id)}">Book appointment</button>`
      : ""}
  </article>`).join("");

  const addButton = currentUser.role === "admin"
    ? '<button class="btn primary" data-add-doctor>Add doctor</button>'
    : "";

  return heading(
    "Doctors & services",
    "Browse the available demo doctor directory.",
    addButton
  ) + `<div class="doctor-grid">${cards}</div>`;
}

/* REPORTS */

function renderReports() {
  if (currentUser.role !== "admin") {
    return heading(
      "Reports",
      "Reports are available to the admin demo account."
    ) + empty("Please sign in as admin to view reports.");
  }

  const all = data.appointments;
  const csvButton = '<button class="btn primary" data-export>Export CSV</button>';

  return heading(
    "Reports",
    "Summary of demo appointment activity.",
    csvButton
  ) + `<div class="stats-grid">
      ${stat("Total bookings", all.length, "▣")}
      ${stat("Waiting", all.filter(a => a.status === "waiting").length, "◷")}
      ${stat("Completed", all.filter(a => a.status === "completed").length, "✓")}
      ${stat("Cancelled", all.filter(a => a.status === "cancelled").length, "×")}
    </div>` +
    panel("All appointment records", appointmentTable(all, true));
}

/* SETTINGS */

function renderSettings() {
  return heading(
    "Settings",
    "Manage your demo profile and preferences."
  ) + `<section class="panel">
    <div class="panel-header"><h3>Profile information</h3></div>
    <div class="panel-body">
      <form id="profileForm">
        <div class="field">
          <label for="profileName">Full name</label>
          <input id="profileName" required maxlength="80" value="${safe(currentUser.name)}">
        </div>

        <div class="field">
          <label for="profileEmail">Email address</label>
          <input id="profileEmail" type="email" required value="${safe(currentUser.email)}">
        </div>

        <p class="muted">Account type: ${safe(currentUser.role)}</p>
        <br>
        <button class="btn primary" type="submit">Save profile</button>
      </form>
    </div>
  </section>

  <section class="panel">
    <div class="panel-header"><h3>Demo data</h3></div>
    <div class="panel-body">
      <p class="muted">Reset the demo data stored in this browser.</p>
      <br>
      <button class="btn danger" data-reset>Reset demo data</button>
    </div>
  </section>`;
}

/* =========================================================
   SENIOR VIDEO CARE (60+)  —  separate section, not part of
   the normal booking system.

   Flow:  1) enter age   2) re-verify age with date of birth
          3) fill the online video-consultation form

   Video consultations are stored in data.videoConsults, apart
   from the normal appointments and the live queue.
   ========================================================= */

const SENIOR_KEY = "mediqueue_senior_mode_v1";
const MIN_SENIOR_AGE = 60;
const MAX_VERIFY_ATTEMPTS = 3;

const VIDEO_TIMES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
];

const VIDEO_REASONS = [
  "General health check-up", "Fever", "Cough, cold or sore throat",
  "Heart or blood pressure concern", "Diabetes or hormone concern",
  "Bone, muscle or joint pain", "Stomach or digestion problem",
  "Eye problem", "Ear, nose or throat problem", "Mental wellness",
  "Test or report review", "Medicine follow-up", "Other"
];

let seniorDraft = null;     // after step 1: { name, age, attempts }
let seniorVerified = null;  // after step 2: { name, age, dob } (this session only)
let seniorNotice = null;    // one-time message: { type: "error" | "ok", text }

function ageFromDob(dobText) {
  const dob = new Date(dobText + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function myVideoConsults() {
  if (currentUser.role === "patient") {
    return data.videoConsults.filter(v => v.patientId === currentUser.id);
  }
  if (currentUser.role === "doctor") {
    return data.videoConsults.filter(
      v => v.doctorId === (ownDoctor()?.id || "d1")
    );
  }
  return data.videoConsults;
}

/* Large text mode (helpful for elderly users) */

function seniorModeOn() {
  return localStorage.getItem(SENIOR_KEY) === "1";
}

function applySeniorMode() {
  document.body.classList.toggle("senior-mode", seniorModeOn());
}

function toggleSeniorMode() {
  localStorage.setItem(SENIOR_KEY, seniorModeOn() ? "0" : "1");
  applySeniorMode();
  renderPage();
  toast(seniorModeOn() ? "Large text mode is on." : "Large text mode is off.");
}

/* Video call window (uses free Jitsi Meet rooms) */

function closeVideoCall() {
  const overlay = $("#videoOverlay");
  if (overlay) overlay.remove();
}

function openVideoCall(id) {
  const v = data.videoConsults.find(x => x.id === id);

  if (!v) return toast("Video consultation not found.");

  if (currentUser.role === "patient" && v.patientId !== currentUser.id) {
    return toast("You can only join your own video consultation.");
  }

  if (v.status !== "booked") {
    return toast("This video consultation is not active.");
  }

  closeVideoCall();

  const room = "QueueCare-" + String(v.id).replace(/[^a-zA-Z0-9]/g, "");
  const link = "https://meet.jit.si/" + room;
  const hash = "#userInfo.displayName=" + encodeURIComponent(JSON.stringify(currentUser.name));
  const waitingFor = currentUser.role === "doctor" ? "the patient" : "the doctor";

  const overlay = document.createElement("div");
  overlay.id = "videoOverlay";
  overlay.className = "video-overlay";
  overlay.innerHTML = `
    <div class="video-shell">
      <div class="video-top">
        <div>
          <strong>📹 Video consultation</strong>
          <span>${safe(v.token)} · ${safe(v.patientName)} (${safe(v.age)} yrs) · ${safe(v.doctorName)} · ${dateText(v.date)} ${timeText(v.time)}</span>
        </div>
        <button class="btn danger big" data-close-video>✕ Leave call</button>
      </div>

      <div class="video-stage" id="videoStage">
        <div class="video-start">
          <div class="video-icon">📹</div>
          <h2>Ready for your video visit?</h2>
          <ol class="video-steps">
            <li>Sit in a bright place and hold your phone or laptop steady.</li>
            <li>Press <b>Start video call</b>, then press <b>Allow</b> for camera and microphone.</li>
            <li>Wait for ${waitingFor} to join. A family member can join using the link.</li>
          </ol>
          <div class="video-buttons">
            <button class="btn video big" id="startVideoBtn">▶ Start video call</button>
            <button class="btn secondary big" id="copyVideoLink">🔗 Copy link for family</button>
            <a class="btn secondary big" href="${link}" target="_blank" rel="noopener">↗ Open in new tab</a>
          </div>
          <p class="video-note">Video is provided by Jitsi Meet, a free external service, and needs internet. Academic prototype only. Do not share real medical details.</p>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  $("#startVideoBtn", overlay).addEventListener("click", () => {
    $("#videoStage", overlay).innerHTML =
      `<iframe class="video-frame" title="Video consultation" allow="camera; microphone; fullscreen; display-capture; autoplay" src="${link}${hash}"></iframe>`;
  });

  $("#copyVideoLink", overlay).addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Call link copied. Send it to your family member.");
    } catch {
      toast("Could not copy. Use Open in new tab and share that link.");
    }
  });
}

/* Page: Video care (60+) */

function videoTable(list) {
  if (!list.length) return empty("No video consultations yet.");

  const isStaff = currentUser.role !== "patient";

  return `<div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th>Token</th>
          <th>Senior patient</th>
          <th>Doctor</th>
          <th>Date & time</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${list.slice().reverse().map(v => {
          const active = v.status === "booked";
          return `<tr>
            <td><span class="token-pill">${safe(v.token)}</span></td>
            <td>
              ${safe(v.patientName)} (${safe(v.age)} yrs)
              ${v.helperName
                ? `<small class="cell-sub">Helper: ${safe(v.helperName)}${v.helperPhone ? " · " + safe(v.helperPhone) : ""}</small>`
                : ""}
            </td>
            <td>${safe(v.doctorName)}</td>
            <td>${dateText(v.date)} · ${timeText(v.time)}</td>
            <td>${statusHTML(v.status)}</td>
            <td>
              <div class="row-actions">
                ${active && currentUser.role !== "admin"
                  ? `<button class="btn video small" data-join-vc="${safe(v.id)}">📹 Join</button>`
                  : ""}
                ${active && isStaff
                  ? `<button class="btn secondary small" data-complete-vc="${safe(v.id)}">Mark done</button>`
                  : ""}
                ${active && !isStaff
                  ? `<button class="btn danger small" data-cancel-vc="${safe(v.id)}">Cancel</button>`
                  : ""}
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function seniorStepper(step) {
  const labels = ["Enter age", "Verify age", "Online form"];
  return `<div class="steps">${labels.map((label, i) => {
    const n = i + 1;
    const cls = n < step ? "done" : n === step ? "active" : "";
    return `<div class="step ${cls}"><span>${n < step ? "✓" : n}</span>${label}</div>`;
  }).join("")}</div>`;
}

function seniorStepOne() {
  return panel("Step 1 · Enter the patient's age", `
    <p class="muted">Video care is only for senior citizens aged ${MIN_SENIOR_AGE} years and above.</p>
    <br>
    <form id="seniorAgeForm">
      <div class="form-grid">
        <div class="field">
          <label for="seniorName">Senior patient's full name *</label>
          <input id="seniorName" type="text" maxlength="80" required value="${safe(currentUser.name)}">
        </div>
        <div class="field">
          <label for="seniorAge">Age (must be 60 or above) *</label>
          <input id="seniorAge" type="number" min="60" max="120" required placeholder="e.g. 68" title="Age must be 60 or above">
        </div>
      </div>
      <button class="btn video" type="submit">Check age →</button>
    </form>`);
}

function seniorStepTwo() {
  return panel("Step 2 · Verify the age again", `
    <p class="muted">You entered <b>${safe(seniorDraft.age)} years</b> for <b>${safe(seniorDraft.name)}</b>. To confirm, please enter the date of birth. It must match the age.</p>
    <br>
    <form id="seniorVerifyForm">
      <div class="field">
        <label for="seniorDob">Date of birth *</label>
        <input id="seniorDob" type="date" min="1900-01-01" max="${today()}" required>
      </div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn video" type="submit">Verify age ✓</button>
        <button class="btn secondary" type="button" data-reset-senior>← Start again</button>
      </div>
    </form>`);
}

function seniorStepThree() {
  const doctors = data.doctors.filter(d => d.available);

  return `<div class="verified-banner">
      <span>✓ Age verified: <b>${safe(seniorVerified.name)}</b>, ${safe(seniorVerified.age)} years</span>
      <button class="btn secondary small" data-reset-senior>Verify a different person</button>
    </div>` +
    panel("Step 3 · Online video consultation form", `
    <form id="videoForm">
      <div class="form-grid">
        <div class="field full-span">
          <label for="videoDoctor">Choose doctor *</label>
          <select id="videoDoctor" required>
            <option value="">Select a doctor</option>
            ${doctors.map(d =>
              `<option value="${safe(d.id)}">${safe(d.name)} — ${safe(d.specialty)}</option>`
            ).join("")}
          </select>
        </div>

        <div class="field">
          <label for="videoDate">Date *</label>
          <input id="videoDate" type="date" min="${today()}" value="${today()}" required>
        </div>

        <div class="field">
          <label for="videoTime">Time *</label>
          <select id="videoTime" required>
            ${VIDEO_TIMES.map(t => `<option value="${t}">${timeText(t)}</option>`).join("")}
          </select>
        </div>

        <div class="field full-span">
          <label for="videoReason">Why do you need the doctor? *</label>
          <select id="videoReason" required>
            <option value="">Select a reason</option>
            ${VIDEO_REASONS.map(r => `<option value="${safe(r)}">${safe(r)}</option>`).join("")}
          </select>
        </div>

        <div class="field full-span">
          <label for="videoDetails">Additional details (optional)</label>
          <textarea id="videoDetails" maxlength="500" rows="3" placeholder="Briefly describe the problem (optional)."></textarea>
        </div>

        <div class="field">
          <label for="helperName">Helper / family member name</label>
          <input id="helperName" type="text" maxlength="80" placeholder="Optional">
        </div>

        <div class="field">
          <label for="helperPhone">Helper phone number</label>
          <input id="helperPhone" type="tel" maxlength="15" placeholder="Optional">
        </div>

        <div class="field full-span">
          <label class="check-row">
            <input type="checkbox" id="videoConfirm">
            <span>I confirm the age details are correct and I will keep an ID proof ready for the doctor.</span>
          </label>
        </div>
      </div>
      <button class="btn video big" type="submit">📹 Confirm video consultation</button>
    </form>`);
}

function renderVideo() {
  const notice = seniorNotice;
  seniorNotice = null;

  const noticeHTML = notice
    ? `<div class="notice ${notice.type}">${safe(notice.text)}</div>`
    : "";

  const largeText = `<button class="btn secondary" data-toggle-senior>A+ Large text ${seniorModeOn() ? "(on)" : "(off)"}</button>`;

  /* Doctor and admin: only see the video consultation list */
  if (currentUser.role !== "patient") {
    const all = myVideoConsults();
    const count = st => all.filter(v => v.status === st).length;

    return heading(
      "Video care (60+)",
      currentUser.role === "admin"
        ? "All video consultations for senior citizens."
        : "Your video consultations with senior citizens.",
      currentUser.role === "admin"
        ? '<button class="btn primary" data-export-vc>Export CSV</button>'
        : ""
    ) + `<div class="stats-grid">
        ${stat("Total", all.length, "📹")}
        ${stat("Booked", count("booked"), "◷")}
        ${stat("Completed", count("completed"), "✓")}
        ${stat("Cancelled", count("cancelled"), "×")}
      </div>` +
      panel("Video consultations", videoTable(all));
  }

  /* Patient: age check -> verify -> form */
  const step = seniorVerified ? 3 : seniorDraft ? 2 : 1;

  const hero = `<div class="video-hero">
    <div class="video-hero-icon">📹</div>
    <div>
      <h2>See the doctor from home</h2>
      <p>For senior citizens aged ${MIN_SENIOR_AGE}+ who find it hard to travel. First confirm the age, then fill a short online form. A family member can join the call.</p>
    </div>
    ${largeText}
  </div>`;

  const stage = step === 1 ? seniorStepOne()
    : step === 2 ? seniorStepTwo()
    : seniorStepThree();

  return heading(
    "Video care (60+)",
    "A separate service for senior citizens. It does not use the normal booking."
  ) + hero + noticeHTML + seniorStepper(step) + stage +
    panel("My video consultations", videoTable(myVideoConsults()));
}

/* Step handlers */

function submitSeniorAge() {
  const name = $("#seniorName").value.trim();
  const age = parseInt($("#seniorAge").value, 10);

  if (!name) return toast("Please enter the patient's name.");

  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return toast("Please enter a valid age.");
  }

  if (age < MIN_SENIOR_AGE) {
    seniorNotice = {
      type: "error",
      text: `Video care is only for age ${MIN_SENIOR_AGE} and above. Please use "Book appointment" for a normal visit.`
    };
    return renderPage();
  }

  seniorDraft = { name, age, attempts: 0 };
  renderPage();
}

function submitSeniorVerify() {
  const dob = $("#seniorDob").value;

  if (!dob || dob > today()) {
    return toast("Please enter a valid date of birth.");
  }

  const calculated = ageFromDob(dob);

  if (calculated !== seniorDraft.age || calculated < MIN_SENIOR_AGE) {
    seniorDraft.attempts++;

    if (seniorDraft.attempts >= MAX_VERIFY_ATTEMPTS) {
      seniorDraft = null;
      seniorNotice = {
        type: "error",
        text: "Age could not be verified after 3 attempts. Please start again with the correct details."
      };
    } else {
      seniorNotice = {
        type: "error",
        text: `The date of birth does not match the age entered. Attempts left: ${MAX_VERIFY_ATTEMPTS - seniorDraft.attempts}.`
      };
    }

    return renderPage();
  }

  seniorVerified = { name: seniorDraft.name, age: calculated, dob };
  seniorDraft = null;
  seniorNotice = { type: "ok", text: "Age verified. You can now fill the online form." };
  renderPage();
}

function submitVideoForm() {
  if (!seniorVerified) return toast("Please verify the age first.");

  const doctor = doctorFor($("#videoDoctor").value);
  const date = $("#videoDate").value;
  const time = $("#videoTime").value;
  const reason = $("#videoReason").value;
  const details = $("#videoDetails").value.trim();
  const helperName = $("#helperName").value.trim();
  const helperPhone = $("#helperPhone").value.trim();

  if (!doctor || !date || !time || !reason) {
    return toast("Please complete all required fields.");
  }

  if (!doctor.available) return toast("This doctor is unavailable.");

  if (date < today()) return toast("Choose today or a future date.");

  if (helperPhone && !/^[0-9+\-\s]{7,15}$/.test(helperPhone)) {
    return toast("Enter a valid helper phone number.");
  }

  if (!$("#videoConfirm").checked) {
    return toast("Please tick the confirmation box.");
  }

  const clash =
    data.appointments.some(a =>
      a.doctorId === doctor.id && a.date === date && a.time === time &&
      !["cancelled", "skipped"].includes(a.status)
    ) ||
    data.videoConsults.some(v =>
      v.doctorId === doctor.id && v.date === date && v.time === time &&
      v.status !== "cancelled"
    );

  if (clash) return toast("That time slot is already booked.");

  const consult = {
    id: "v-" + Date.now(),
    token: "VID-" + String(data.videoConsults.length + 1).padStart(3, "0"),
    patientId: currentUser.id,
    patientName: seniorVerified.name,
    age: seniorVerified.age,
    dob: seniorVerified.dob,
    doctorId: doctor.id,
    doctorName: doctor.name,
    department: doctor.department,
    date,
    time,
    reason,
    details,
    helperName,
    helperPhone,
    status: "booked",
    createdAt: Date.now()
  };

  data.videoConsults.push(consult);

  notify(
    currentUser.id,
    "Video consultation booked",
    `Your video consultation ${consult.token} with ${doctor.name} is booked. Open Video care (60+) and press Join at your time.`
  );

  saveData();
  seniorNotice = { type: "ok", text: `Video consultation booked. Token: ${consult.token}` };
  renderPage();
  toast("Video consultation booked! Token: " + consult.token);
}

function exportVideoCSV() {
  if (currentUser.role !== "admin") return toast("Admin access required.");

  const rows = [
    ["Token", "Senior Patient", "Age", "Doctor", "Department", "Date", "Time",
     "Reason", "Details", "Helper Name", "Helper Phone", "Status"],
    ...data.videoConsults.map(v => [
      v.token, v.patientName, v.age, v.doctorName, v.department, v.date, v.time,
      v.reason, v.details || "", v.helperName || "", v.helperPhone || "", v.status
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "mediqueue-video-care-report.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Video care CSV exported.");
}

/* RENDER PAGE */

function renderPage() {
  if (!currentUser) return;

  $("#currentSection").textContent = titles[currentPage] || "Overview";

  $$(".nav-item[data-page]").forEach(button =>
    button.classList.toggle("active", button.dataset.page === currentPage)
  );

  const pages = {
    overview: renderOverview,
    appointments: renderAppointments,
    book: renderBook,
    queue: renderQueue,
    patients: renderPatients,
    doctors: renderDoctors,
    reports: renderReports,
    video: renderVideo,
    settings: renderSettings
  };

  $("#pageContent").innerHTML = (pages[currentPage] || renderOverview)();

  const unread = data.notifications.some(n =>
    n.userId === currentUser.id && !n.read
  );

  $("#notificationDot").style.display = unread ? "block" : "none";
  $("#sidebar").classList.remove("open");
}

function navigate(page) {
  if (!titles[page]) return;

  if (
    page === "patients" &&
    !["doctor", "admin"].includes(currentUser.role)
  ) {
    return toast("This page is for staff accounts.");
  }

  if (page === "reports" && currentUser.role !== "admin") {
    return toast("Admin access required.");
  }

  currentPage = page;
  renderPage();
}

/* BOOK APPOINTMENT */

function bookAppointment(event) {
  event.preventDefault();

  const doctor = doctorFor($("#doctorSelect").value);
  const date = $("#appointmentDate").value;
  const time = $("#appointmentTime").value;
  const consultationType = $("#consultationType").value;
  const reason = $("#appointmentReason").value;
  const consultationDetails = $("#consultationDetails").value.trim();

  if (!doctor || !date || !time || !consultationType || !reason) {
    return toast("Please complete all required fields.");
  }

  if (!doctor.available) {
    return toast("This doctor is unavailable.");
  }

  if (date < today()) {
    return toast("Choose today or a future date.");
  }

  const conflict = data.appointments.some(a =>
    a.doctorId === doctor.id &&
    a.date === date &&
    a.time === time &&
    !["cancelled", "skipped"].includes(a.status)
  );

  if (conflict) {
    return toast("That time slot is already booked.");
  }

  const department = doctor.department.toUpperCase();
  const prefix = department.includes("CARD") ? "CARD" :
    department.includes("DERM") ? "DERM" :
    department.replace(/[^A-Z]/g, "").slice(0, 4) || "GEN";

  const count = data.appointments.filter(a =>
    a.doctorId === doctor.id && a.date === date
  ).length + 1;

  const appointment = {
    id: "a-" + Date.now(),
    token: `${prefix}-${String(count).padStart(3, "0")}`,
    patientId: currentUser.id,
    patientName: currentUser.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    department: doctor.department,
    date,
    time,
    consultationType,
    reason,
    consultationDetails,
    status: "waiting",
    createdAt: Date.now()
  };

  data.appointments.push(appointment);

  notify(
    currentUser.id,
    "Appointment confirmed",
    `Your token ${appointment.token} with ${doctor.name} has been booked.`
  );

  saveData();
  currentPage = "appointments";
  renderPage();

  toast("Appointment booked! Token: " + appointment.token);
}

/* APPOINTMENT DETAILS */

function appointmentDetails(id) {
  const a = data.appointments.find(x => x.id === id);

  if (!a) return toast("Appointment not found.");

  if (currentUser.role === "patient" && a.patientId !== currentUser.id) {
    return toast("You can only view your own appointment.");
  }

  const cancelButton =
    currentUser.role === "patient" &&
    ["waiting", "booked", "called"].includes(a.status)
      ? `<button class="btn danger" data-cancel="${safe(a.id)}">Cancel appointment</button>`
      : "";

  $("#modalTitle").textContent = "Appointment details";

  $("#modalBody").innerHTML = `
    <div class="queue-card">
      <div class="queue-label">TOKEN NUMBER</div>
      <div class="queue-token">${safe(a.token)}</div>
      <p>${safe(a.doctorName)} · ${safe(a.department)}</p>
    </div>

    <div class="settings-row">
      <div><strong>Patient</strong><small>${safe(a.patientName)}</small></div>
      ${statusHTML(a.status)}
    </div>

    <div class="settings-row">
      <div><strong>Date and time</strong><small>${dateText(a.date)} · ${timeText(a.time)}</small></div>
    </div>

    <div class="settings-row">
      <div><strong>Consultation type</strong><small>${safe(a.consultationType || "Not specified")}</small></div>
    </div>

    <div class="settings-row">
      <div><strong>Reason for visit</strong><small>${safe(a.reason || "Not specified")}</small></div>
    </div>

    <div class="settings-row">
      <div><strong>Additional details</strong><small>${safe(a.consultationDetails || "No additional details provided")}</small></div>
    </div>

    <div class="settings-row">
      <div><strong>Estimated wait</strong><small>About ${waitMinutes(a)} minute(s)</small></div>
    </div>

    <div class="modal-actions">
      <button class="btn secondary" data-close>Close</button>
      ${cancelButton}
    </div>
  `;

  $("#modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
}

/* NOTIFICATIONS */

function showNotifications() {
  const notes = data.notifications.filter(n => n.userId === currentUser.id);

  notes.forEach(n => n.read = true);
  saveData();

  $("#modalTitle").textContent = "Notifications";

  $("#modalBody").innerHTML = notes.length
    ? notes.slice().reverse().map(n => `
        <div class="notification-item">
          <span>🔔</span>
          <div>
            <strong>${safe(n.title)}</strong><br>
            ${safe(n.message)}
            <br><small class="muted">${new Date(n.time).toLocaleString()}</small>
          </div>
        </div>
      `).join("")
    : '<div class="empty-state">You have no notifications.</div>';

  $("#modalBackdrop").classList.remove("hidden");
  $("#notificationDot").style.display = "none";
}

/* ADD DOCTOR */

function addDoctor() {
  $("#modalTitle").textContent = "Add a doctor";

  $("#modalBody").innerHTML = `
    <form id="addDoctorForm">
      <div class="field">
        <label for="newName">Doctor name *</label>
        <input id="newName" required placeholder="Dr. Full Name">
      </div>

      <div class="field">
        <label for="newSpecialty">Specialty *</label>
        <input id="newSpecialty" required placeholder="e.g. Neurology">
      </div>

      <div class="field">
        <label for="newDepartment">Department *</label>
        <input id="newDepartment" required placeholder="e.g. Neurology">
      </div>

      <div class="field">
        <label for="newRoom">Room</label>
        <input id="newRoom" placeholder="Room 210">
      </div>

      <div class="modal-actions">
        <button type="button" class="btn secondary" data-close>Cancel</button>
        <button class="btn primary" type="submit">Add doctor</button>
      </div>
    </form>
  `;

  $("#modalBackdrop").classList.remove("hidden");
}

/* EXPORT CSV */

function exportCSV() {
  if (currentUser.role !== "admin") {
    return toast("Admin access required.");
  }

  const rows = [
    [
      "Token", "Patient", "Doctor", "Department", "Date", "Time",
      "Consultation Type", "Reason", "Additional Details", "Status"
    ],
    ...data.appointments.map(a => [
      a.token,
      a.patientName,
      a.doctorName,
      a.department,
      a.date,
      a.time,
      a.consultationType || "",
      a.reason,
      a.consultationDetails || "",
      a.status
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "mediqueue-report.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("CSV report exported.");
}

/* AUTHENTICATION EVENTS */

$("#loginTab").addEventListener("click", () => authTab("login"));
$("#registerTab").addEventListener("click", () => authTab("register"));

$("#authForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("#email").value.trim().toLowerCase();
  const password = $("#password").value;

  if (authMode === "register") {
    const name = $("#fullName").value.trim();
    const role = $("#registerRole").value;

    if (!name) return toast("Enter your full name.");

    if (data.users.some(u => u.email.toLowerCase() === email)) {
      return toast("An account with this email already exists.");
    }

    const user = {
      id: "u-" + Date.now(),
      name,
      email,
      password,
      role
    };

    data.users.push(user);

    if (role === "doctor") {
      data.doctors.push({
        id: "d-" + Date.now(),
        name,
        specialty: "General Physician",
        department: "General Medicine",
        room: "Room TBC",
        experience: "Not specified",
        available: true,
        avgMinutes: 10
      });
    }

    saveData();
    loginAs(user);
    toast("Account created successfully.");
  } else {
    const user = data.users.find(u =>
      u.email.toLowerCase() === email && u.password === password
    );

    if (!user) return toast("Invalid email or password.");

    loginAs(user);
    toast("Welcome back, " + user.name.split(" ")[0] + "!");
  }
});

$$("[data-demo]").forEach(button => {
  button.addEventListener("click", () => {
    const role = button.dataset.demo;
    const email = `${role}@demo.com`;

    $("#email").value = email;
    $("#password").value = "demo123";

    authTab("login");

    const user = data.users.find(u => u.email === email);

    if (user) {
      loginAs(user);
    } else {
      toast("Demo account not found. Reset demo data in Settings.");
    }
  });
});

/* DASHBOARD EVENTS */

$("#logoutBtn")?.addEventListener("click", logout);

$("#notificationBtn").addEventListener("click", showNotifications);
$("#mobileMenu").addEventListener("click", () =>
  $("#sidebar").classList.toggle("open")
);

$("#closeModal").addEventListener("click", closeModal);

$("#modalBackdrop").addEventListener("click", event => {
  if (event.target === $("#modalBackdrop")) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

$("#mainNav").addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (button) navigate(button.dataset.page);
});

/* PAGE BUTTON EVENTS */

$("#pageContent").addEventListener("click", event => {
  const go = event.target.closest("[data-go]");
  if (go) return navigate(go.dataset.go);

  const detail = event.target.closest("[data-detail]");
  if (detail) return appointmentDetails(detail.dataset.detail);

  const bookDoctor = event.target.closest("[data-book-doctor]");

  if (bookDoctor) {
    const doctorId = bookDoctor.dataset.bookDoctor;
    navigate("book");

    const select = $("#doctorSelect");
    if (select) select.value = doctorId;

    return;
  }

  const cancel = event.target.closest("[data-cancel]");

  if (cancel) {
    const appointment = data.appointments.find(
      a => a.id === cancel.dataset.cancel
    );

    if (appointment && confirm("Cancel this appointment?")) {
      appointment.status = "cancelled";

      notify(
        appointment.patientId,
        "Appointment cancelled",
        `Your token ${appointment.token} was cancelled.`
      );

      saveData();
      closeModal();
      renderPage();
      toast("Appointment cancelled.");
    }

    return;
  }

  if (event.target.closest("[data-close]")) {
    return closeModal();
  }

  if (event.target.closest("[data-add-doctor]")) {
    return addDoctor();
  }

  const toggle = event.target.closest("[data-toggle-doctor]");

  if (toggle) {
    if (currentUser.role !== "admin") {
      return toast("Admin access required.");
    }

    const doctor = doctorFor(toggle.dataset.toggleDoctor);

    if (doctor) {
      doctor.available = !doctor.available;
      saveData();
      renderPage();
      toast("Doctor availability updated.");
    }

    return;
  }

  if (event.target.closest("[data-export]")) {
    return exportCSV();
  }

  if (event.target.closest("[data-reset]")) {
    if (!confirm("Reset all demo data stored in this browser?")) return;

    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(SESSION_KEY);

    data = loadData();
    currentUser = null;

    showAuth();
    toast("Demo data reset.");
  }
});

/* FORM SUBMISSIONS */

$("#pageContent").addEventListener("submit", event => {
  if (event.target.id === "bookingForm") {
    return bookAppointment(event);
  }

  if (event.target.id === "profileForm") {
    event.preventDefault();

    const name = $("#profileName").value.trim();
    const email = $("#profileEmail").value.trim().toLowerCase();

    if (!name || !email) {
      return toast("Name and email are required.");
    }

    const duplicate = data.users.find(u =>
      u.email.toLowerCase() === email && u.id !== currentUser.id
    );

    if (duplicate) {
      return toast("That email is already in use.");
    }

    const user = data.users.find(u => u.id === currentUser.id);

    user.name = name;
    user.email = email;

    data.appointments.forEach(a => {
      if (a.patientId === user.id) {
        a.patientName = name;
      }
    });

    currentUser = { ...user };

    saveData();
    showApp();

    currentPage = "settings";
    renderPage();

    toast("Profile updated.");
    return;
  }

  if (event.target.id === "addDoctorForm") {
    event.preventDefault();

    if (currentUser.role !== "admin") {
      return toast("Admin access required.");
    }

    const name = $("#newName").value.trim();
    const specialty = $("#newSpecialty").value.trim();
    const department = $("#newDepartment").value.trim();

    if (!name || !specialty || !department) {
      return toast("Complete all required fields.");
    }

    data.doctors.push({
      id: "d-" + Date.now(),
      name,
      specialty,
      department,
      room: $("#newRoom").value.trim() || "Room TBC",
      experience: "Not specified",
      available: true,
      avgMinutes: 10
    });

    saveData();
    closeModal();
    renderPage();
    toast("Doctor added.");
  }
});

/* INITIAL SETUP */

data.appointments.forEach(a => {
  if (!a.date) a.date = today();
});

saveData();

/* VIDEO CARE (60+) EVENTS */

document.addEventListener("submit", event => {
  const id = event.target.id;

  if (id === "seniorAgeForm") { event.preventDefault(); return submitSeniorAge(); }
  if (id === "seniorVerifyForm") { event.preventDefault(); return submitSeniorVerify(); }
  if (id === "videoForm") { event.preventDefault(); return submitVideoForm(); }
});

document.addEventListener("click", event => {
  const t = event.target;

  const join = t.closest("[data-join-vc]");
  if (join) return openVideoCall(join.dataset.joinVc);

  if (t.closest("[data-close-video]")) return closeVideoCall();
  if (t.closest("[data-toggle-senior]")) return toggleSeniorMode();
  if (t.closest("[data-export-vc]")) return exportVideoCSV();

  if (t.closest("[data-reset-senior]")) {
    seniorDraft = null;
    seniorVerified = null;
    return renderPage();
  }

  const cancel = t.closest("[data-cancel-vc]");
  if (cancel) {
    const v = data.videoConsults.find(x => x.id === cancel.dataset.cancelVc);
    if (v && confirm("Cancel this video consultation?")) {
      v.status = "cancelled";
      notify(v.patientId, "Video consultation cancelled", `Your video consultation ${v.token} was cancelled.`);
      saveData();
      renderPage();
      toast("Video consultation cancelled.");
    }
    return;
  }

  const done = t.closest("[data-complete-vc]");
  if (done) {
    if (currentUser.role === "patient") return;
    const v = data.videoConsults.find(x => x.id === done.dataset.completeVc);
    if (v) {
      v.status = "completed";
      notify(v.patientId, "Video consultation completed", `Your video consultation ${v.token} is marked completed.`);
      saveData();
      renderPage();
      toast("Marked as completed.");
    }
  }
});

(function ensureVideoNav() {
  const nav = $("#mainNav");
  if (!nav || nav.querySelector('[data-page="video"]')) return;

  const button = document.createElement("button");
  button.className = "nav-item";
  button.dataset.page = "video";
  button.innerHTML = "<span>📹</span> Video care (60+)";

  const after = nav.querySelector('[data-page="doctors"]');
  if (after) after.after(button);
  else nav.appendChild(button);
})();

applySeniorMode();

const savedUserId = localStorage.getItem(SESSION_KEY);
const savedUser = data.users.find(u => u.id === savedUserId);

if (savedUser) {
  loginAs(savedUser);
} else {
  showAuth();
}



/* =========================================
   MEDIQUEUE HELP DESK
   ========================================= */

(function setupHelpDesk() {
  const style = document.createElement("style");

  style.textContent = `
    #helpDeskCard {
      cursor: pointer;
      transition: background .2s, transform .2s;
    }

    #helpDeskCard:hover {
      background: rgba(255,255,255,.07);
      transform: translateY(-2px);
    }

    #helpDeskCard:focus-visible {
      outline: 2px solid #d6bd70;
      outline-offset: 3px;
    }

    #helpDeskOverlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(20, 20, 25, .65);
    }

    #helpDeskOverlay.help-hidden {
      display: none;
    }

    #helpDeskModal {
      width: 100%;
      max-width: 470px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 26px;
      box-sizing: border-box;
      border-radius: 18px;
      background: #fff;
      color: #25252a;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      font-family: inherit;
    }

    #helpDeskModal h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    #helpDeskModal p {
      line-height: 1.6;
      color: #737582;
    }

    #helpDeskModal .help-contact {
      margin: 18px 0;
      padding: 16px;
      border-radius: 12px;
      background: #f7f4e9;
      border: 1px solid #e9dfbd;
    }

    #helpDeskModal .help-contact strong {
      display: block;
      margin-bottom: 6px;
      color: #806a2c;
    }

    #helpDeskModal .help-field {
      margin: 15px 0;
    }

    #helpDeskModal label {
      display: block;
      margin-bottom: 7px;
      font-size: 14px;
      font-weight: 600;
    }

    #helpDeskModal input,
    #helpDeskModal textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #dedee5;
      border-radius: 9px;
      font: inherit;
      color: #25252a;
      background: #fff;
    }

    #helpDeskModal textarea {
      min-height: 110px;
      resize: vertical;
    }

    #helpDeskModal .help-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
    }

    #helpDeskModal .help-btn {
      padding: 11px 17px;
      border: 0;
      border-radius: 9px;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
    }

    #helpDeskModal .help-close {
      background: #eeeef2;
      color: #303038;
    }

    #helpDeskModal .help-send {
      background: #d6bd70;
      color: #29261d;
    }

    #helpDeskModal .help-status {
      margin-top: 12px;
      font-size: 13px;
    }

    @media(max-width: 480px) {
      #helpDeskModal {
        padding: 20px;
      }
    }
  `;

  document.head.appendChild(style);

  // Create the help desk popup.
  const overlay = document.createElement("div");
  overlay.id = "helpDeskOverlay";
  overlay.className = "help-hidden";

  overlay.innerHTML = `
    <section id="helpDeskModal"
             role="dialog"
             aria-modal="true"
             aria-labelledby="helpDeskTitle">

      <h2 id="helpDeskTitle">💬 Help Desk</h2>

      <p>
        Need assistance with booking an appointment or using MediQueue?
        Contact our demo help desk or send a message below.
      </p>

      <div class="help-contact">
        <strong>📞 Hospital Help Desk</strong>
        <span>Demo contact: 1800-000-0000</span>
        <p style="margin:8px 0 0;font-size:13px;">
          This is a sample number for the college project.
          Replace it with your actual help desk number.
        </p>
      </div>

      <form id="helpDeskForm">
        <div class="help-field">
          <label for="helpUserEmail">Your email (optional)</label>
          <input id="helpUserEmail"
                 type="email"
                 placeholder="you@example.com">
        </div>

        <div class="help-field">
          <label for="helpUserMessage">How can we help you? *</label>
          <textarea id="helpUserMessage"
                    maxlength="1000"
                    required
                    placeholder="Write your question or problem here..."></textarea>
        </div>

        <div id="helpDeskStatus"
             class="help-status"
             role="status"></div>

        <div class="help-buttons">
          <button type="button"
                  class="help-btn help-close"
                  id="helpDeskClose">Close</button>

          <button type="submit"
                  class="help-btn help-send">Send Message</button>
        </div>
      </form>
    </section>
  `;

  document.body.appendChild(overlay);

  function openHelpDesk() {
    overlay.classList.remove("help-hidden");
    $("#helpUserMessage").focus();
  }

  function closeHelpDesk() {
    overlay.classList.add("help-hidden");
  }

  // Make the existing sidebar "Need help?" card clickable.
  function makeHelpCardClickable() {
    const sidebar = $("#sidebar");
    if (!sidebar) return;

    const candidates = [...sidebar.querySelectorAll("div, section, article")];

    const helpCard = candidates.find(el =>
      el.textContent.includes("Need help?") &&
      el.textContent.includes("Contact the hospital front desk")
    );

    if (helpCard && helpCard.id !== "helpDeskCard") {
      helpCard.id = "helpDeskCard";
      helpCard.setAttribute("role", "button");
      helpCard.setAttribute("tabindex", "0");
      helpCard.setAttribute("aria-label", "Open Help Desk");

      helpCard.addEventListener("click", openHelpDesk);

      helpCard.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openHelpDesk();
        }
      });
    }
  }

  // Retry after the page has finished creating its sidebar.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", makeHelpCardClickable);
  } else {
    makeHelpCardClickable();
  }

  $("#helpDeskClose").addEventListener("click", closeHelpDesk);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeHelpDesk();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !overlay.classList.contains("help-hidden")) {
      closeHelpDesk();
    }
  });

  // Demo message handling.
  $("#helpDeskForm").addEventListener("submit", event => {
    event.preventDefault();

    const email = $("#helpUserEmail").value.trim();
    const message = $("#helpUserMessage").value.trim();
    const status = $("#helpDeskStatus");

    if (!message) {
      status.textContent = "Please write a message first.";
      status.style.color = "#b42318";
      return;
    }

    // Store the message locally for this college-project demo.
    const messagesKey = "mediqueue_help_messages";
    let messages = [];

    try {
      messages = JSON.parse(localStorage.getItem(messagesKey) || "[]");
      if (!Array.isArray(messages)) messages = [];
    } catch {
      messages = [];
    }

    messages.push({
      id: Date.now(),
      email,
      message,
      date: new Date().toLocaleString(),
      userId: currentUser?.id || null
    });

    localStorage.setItem(messagesKey, JSON.stringify(messages));

    status.textContent =
      "Your message has been saved in this browser. This demo does not send it to hospital staff.";

    status.style.color = "#18794e";

    $("#helpUserMessage").value = "";
    $("#helpUserEmail").value = "";

    toast("Help message saved successfully.");
  });
})();