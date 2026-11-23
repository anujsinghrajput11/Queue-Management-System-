"use strict";

/* MediQueue — Style 2
   College project prototype.
   Fix: Initialize after the HTML is loaded.
*/

document.addEventListener("DOMContentLoaded", function () {

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const DATA_KEY = "mediqueue_demo_v1";
const SESSION_KEY = "mediqueue_session_v1";

const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// ==================== INITIAL DATA ====================

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
  notifications: []
};

// ==================== DATA MANAGEMENT ====================

function saveData() {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function loadData() {
  try {
    const saved = localStorage.getItem(DATA_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      parsed.users ||= [];
      parsed.doctors ||= [];
      parsed.appointments ||= [];
      parsed.notifications ||= [];

      initialData.users.forEach(user => {
        if (!parsed.users.some(u => u.id === user.id)) {
          parsed.users.push({ ...user });
        }
      });

      const existingIds = new Set(parsed.doctors.map(d => d.id));

      initialData.doctors.forEach(doctor => {
        if (!existingIds.has(doctor.id)) {
          parsed.doctors.push({ ...doctor });
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
  settings: "Settings"
};

// ==================== HELPERS ====================

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
  if (!el) {
    console.log(message);
    return;
  }

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

function doctorFor(id) {
  return data.doctors.find(d => d.id === id);
}

function ownDoctor() {
  return data.doctors.find(d => d.name === currentUser?.name) ||
    (currentUser?.role === "doctor" ? data.doctors[0] : null);
}

function myAppointments() {
  if (!currentUser) return [];

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
  if (!a || !["waiting", "booked", "called"].includes(a.status)) return 0;

  return data.appointments.filter(x =>
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

// ==================== LOGIN AND LOGOUT ====================

function showAuth() {
  $("#authView")?.classList.remove("hidden");
  $("#appView")?.classList.add("hidden");
  $("#sidebar")?.classList.remove("open");
}

function loginAs(user) {
  currentUser = { ...user };
  localStorage.setItem(SESSION_KEY, user.id);

  // Always start at Overview after login.
  currentPage = "overview";

  showApp();
}

function logout() {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);

  showAuth();
  toast("You have signed out.");
}

function showApp() {
  if (!currentUser) {
    showAuth();
    return;
  }

  const authView = $("#authView");
  const appView = $("#appView");

  if (!authView || !appView) {
    console.error("MediQueue: #authView or #appView is missing from index.html.");
    return;
  }

  authView.classList.add("hidden");
  appView.classList.remove("hidden");

  const name = currentUser.name || "User";

  if ($("#sideName")) $("#sideName").textContent = name;
  if ($("#sideRole")) $("#sideRole").textContent = currentUser.role + " account";
  if ($("#sideAvatar")) $("#sideAvatar").textContent = name.charAt(0).toUpperCase();
  if ($("#topAvatar")) $("#topAvatar").textContent = name.charAt(0).toUpperCase();
  if ($("#topName")) $("#topName").textContent = name.split(" ")[0];

  $$(".patient-only").forEach(el =>
    el.classList.toggle("hidden", currentUser.role !== "patient")
  );

  $$(".doctor-only").forEach(el =>
    el.classList.toggle("hidden", currentUser.role !== "doctor")
  );

  $$(".admin-only").forEach(el =>
    el.classList.toggle("hidden", currentUser.role !== "admin")
  );

  // Important: render the dashboard immediately.
  renderPage();
}

function authTab(mode) {
  authMode = mode;
  const registering = mode === "register";

  $("#loginTab")?.classList.toggle("active", !registering);
  $("#registerTab")?.classList.toggle("active", registering);
  $("#nameField")?.classList.toggle("hidden", !registering);
  $("#roleField")?.classList.toggle("hidden", !registering);

  if ($("#authTitle")) {
    $("#authTitle").textContent = registering
      ? "Create your account"
      : "Sign in to your account";
  }

  if ($("#authSubtitle")) {
    $("#authSubtitle").textContent = registering
      ? "Get started with MediQueue."
      : "Manage your appointments in one place.";
  }

  if ($("#authSubmit")) {
    $("#authSubmit").innerHTML = registering
      ? "Create account <span>→</span>"
      : "Login <span>→</span>";
  }
}

// ==================== REUSABLE UI ====================

function heading(title, subtitle, actions = "") {
  return `<div class="page-heading">
    <div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
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
    <div class="panel-header">
      <h3>${title}</h3>
      ${action}
    </div>
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

// ==================== OVERVIEW PAGE ====================

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
      </div>`;

  const actions = `<div class="quick-actions">
    <button class="quick-action" data-go="book">
      <span>＋</span><span><strong>Book appointment</strong><small>Choose a doctor and time</small></span>
    </button>
    <button class="quick-action" data-go="appointments">
      <span>▣</span><span><strong>My appointments</strong><small>View your bookings</small></span>
    </button>
    <button class="quick-action" data-go="queue">
      <span>☷</span><span><strong>Live queue</strong><small>Check queue positions</small></span>
    </button>
    <button class="quick-action" data-go="doctors">
      <span>✚</span><span><strong>Doctors</strong><small>Explore services</small></span>
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
        ${panel("Helpful information", `<p class="muted">Arrive a little before your appointment time. Your token helps you follow the demo queue.</p>`)}
      </div>
    </div>`;
}

// ==================== APPOINTMENTS PAGE ====================

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
  ) + panel("Appointment history", appointmentTable(list, currentUser.role !== "patient"));
}

// ==================== BOOK APPOINTMENT ====================

function renderBook() {
  if (currentUser.role !== "patient") {
    return heading("Book appointment", "Appointment booking is available to patient accounts.") +
      empty("Please sign in with a patient account to book.");
  }

  const doctors = data.doctors.filter(d => d.available);

  const consultationTypes = [
    "New consultation", "Follow-up visit", "Routine health check-up",
    "Preventive care", "Test or report review", "Vaccination", "Other"
  ];

  const reasons = [
    "Fever", "Headache or dizziness", "Cough, cold or sore throat",
    "Stomach or digestion problem", "Heart or blood pressure concern",
    "Skin problem or allergy", "Bone, muscle or joint pain", "Child health",
    "Women's health", "Eye problem", "Ear, nose or throat problem",
    "Dental problem", "Diabetes or hormone concern", "Mental wellness",
    "General health check-up", "Test or report review", "Other"
  ];

  return heading("Book an appointment", "Select a doctor, consultation type, and reason for your visit.") +
    `<section class="panel">
      <div class="panel-header"><h3>Appointment details</h3></div>
      <div class="panel-body">
        <form id="bookingForm">
          <div class="form-grid">
            <div class="field full-span">
              <label for="doctorSelect">Choose doctor *</label>
              <select id="doctorSelect" required>
                <option value="">Select a doctor</option>
                ${doctors.map(d => `<option value="${safe(d.id)}">${safe(d.name)} — ${safe(d.specialty)} (${safe(d.room)})</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="appointmentDate">Date *</label>
              <input id="appointmentDate" type="date" min="${today()}" value="${today()}" required>
            </div>
            <div class="field">
              <label for="appointmentTime">Time *</label>
              <select id="appointmentTime" required>
                ${["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30"].map(t => `<option value="${t}">${timeText(t)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="consultationType">Consultation type *</label>
              <select id="consultationType" required>
                <option value="">Select consultation type</option>
                ${consultationTypes.map(type => `<option value="${safe(type)}">${safe(type)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="appointmentReason">Why are you visiting? *</label>
              <select id="appointmentReason" required>
                <option value="">Select a reason</option>
                ${reasons.map(reason => `<option value="${safe(reason)}">${safe(reason)}</option>`).join("")}
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

// ==================== LIVE QUEUE ====================

function renderQueue() {
  const list = activeAppointments().slice().sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  return heading("Live queue", "Demo queue positions update when appointment status changes.") +
    panel("Current queue", list.length
      ? `<div class="table-wrap"><table class="queue-table">
          <thead><tr><th>Token</th><th>Patient</th><th>Doctor</th><th>Time</th><th>Position</th><th>Status</th></tr></thead>
          <tbody>${list.map(a => `<tr>
            <td><span class="token-pill">${safe(a.token)}</span></td>
            <td>${safe(a.patientName)}</td><td>${safe(a.doctorName)}</td>
            <td>${timeText(a.time)}</td><td>${positionInQueue(a) || "—"}</td>
            <td>${statusHTML(a.status)}</td>
          </tr>`).join("")}</tbody>
        </table></div>`
      : empty("The queue is currently empty."));
}

// ==================== PATIENT LIST ====================

function renderPatients() {
  if (!["doctor", "admin"].includes(currentUser.role)) {
    return heading("Patient list", "Patient list is available to staff accounts.") +
      empty("Please sign in with a doctor or admin demo account.");
  }

  const list = activeAppointments();

  return heading("Patient list", "Patients with active demo appointments.") +
    panel("Current patients", list.length
      ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Patient</th><th>Token</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${list.map(a => `<tr>
            <td>${safe(a.patientName)}</td><td>${safe(a.token)}</td>
            <td>${safe(a.doctorName)}</td><td>${dateText(a.date)}</td>
            <td>${statusHTML(a.status)}</td>
          </tr>`).join("")}</tbody>
        </table></div>`
      : empty("No active patients."));
}

// ==================== DOCTORS PAGE ====================

function renderDoctors() {
  const cards = data.doctors.map(d => `
    <article class="doctor-card">
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
    </article>
  `).join("");

  const addButton = currentUser.role === "admin"
    ? '<button class="btn primary" data-add-doctor>Add doctor</button>'
    : "";

  return heading("Doctors & services", "Browse the available demo doctor directory.", addButton) +
    `<div class="doctor-grid">${cards}</div>`;
}

// ==================== REPORTS ====================

function renderReports() {
  if (currentUser.role !== "admin") {
    return heading("Reports", "Reports are available to the admin demo account.") +
      empty("Please sign in as admin to view reports.");
  }

  const all = data.appointments;

  return heading("Reports", "Summary of demo appointment activity.", '<button class="btn primary" data-export>Export CSV</button>') +
    `<div class="stats-grid">
      ${stat("Total bookings", all.length, "▣")}
      ${stat("Waiting", all.filter(a => a.status === "waiting").length, "◷")}
      ${stat("Completed", all.filter(a => a.status === "completed").length, "✓")}
      ${stat("Cancelled", all.filter(a => a.status === "cancelled").length, "×")}
    </div>` + panel("All appointment records", appointmentTable(all, true));
}

// ==================== SETTINGS ====================

function renderSettings() {
  return heading("Settings", "Manage your demo profile and preferences.") +
    `<section class="panel">
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
          <br><button class="btn primary" type="submit">Save profile</button>
        </form>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h3>Demo data</h3></div>
      <div class="panel-body">
        <p class="muted">Reset demo data stored in this browser.</p>
        <br><button class="btn danger" data-reset>Reset demo data</button>
      </div>
    </section>`;
}

// ==================== PAGE RENDERING ====================

function renderPage() {
  if (!currentUser) return;

  const content = $("#pageContent");

  if (!content) {
    console.error("MediQueue: #pageContent was not found in index.html.");
    return;
  }

  if ($("#currentSection")) {
    $("#currentSection").textContent = titles[currentPage] || "Overview";
  }

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
    settings: renderSettings
  };

  // Render selected page immediately.
  content.innerHTML = (pages[currentPage] || renderOverview)();

  const unread = data.notifications.some(n =>
    n.userId === currentUser.id && !n.read
  );

  if ($("#notificationDot")) {
    $("#notificationDot").style.display = unread ? "block" : "none";
  }

  $("#sidebar")?.classList.remove("open");
}

function navigate(page) {
  if (!titles[page]) return;

  if (page === "patients" && !["doctor", "admin"].includes(currentUser.role)) {
    return toast("This page is for staff accounts.");
  }

  if (page === "reports" && currentUser.role !== "admin") {
    return toast("Admin access required.");
  }

  currentPage = page;
  renderPage();
}

// ==================== BOOKING LOGIC ====================

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

  if (!doctor.available) return toast("This doctor is unavailable.");
  if (date < today()) return toast("Choose today or a future date.");

  const conflict = data.appointments.some(a =>
    a.doctorId === doctor.id &&
    a.date === date &&
    a.time === time &&
    !["cancelled", "skipped"].includes(a.status)
  );

  if (conflict) return toast("That time slot is already booked.");

  const prefix = doctor.department.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
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

// ==================== APPOINTMENT DETAILS ====================

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
    <div class="settings-row"><div><strong>Patient</strong><small>${safe(a.patientName)}</small></div>${statusHTML(a.status)}</div>
    <div class="settings-row"><div><strong>Date and time</strong><small>${dateText(a.date)} · ${timeText(a.time)}</small></div></div>
    <div class="settings-row"><div><strong>Consultation type</strong><small>${safe(a.consultationType || "Not specified")}</small></div></div>
    <div class="settings-row"><div><strong>Reason for visit</strong><small>${safe(a.reason || "Not specified")}</small></div></div>
    <div class="settings-row"><div><strong>Additional details</strong><small>${safe(a.consultationDetails || "No additional details provided")}</small></div></div>
    <div class="settings-row"><div><strong>Estimated wait</strong><small>About ${waitMinutes(a)} minute(s)</small></div></div>
    <div class="modal-actions">
      <button class="btn secondary" data-close>Close</button>
      ${cancelButton}
    </div>`;

  $("#modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  $("#modalBackdrop")?.classList.add("hidden");
}

// ==================== NOTIFICATIONS ====================

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
            ${safe(n.message)}<br>
            <small class="muted">${new Date(n.time).toLocaleString()}</small>
          </div>
        </div>`).join("")
    : '<div class="empty-state">You have no notifications.</div>';

  $("#modalBackdrop").classList.remove("hidden");
  if ($("#notificationDot")) $("#notificationDot").style.display = "none";
}

// ==================== ADD DOCTOR ====================

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
    </form>`;

  $("#modalBackdrop").classList.remove("hidden");
}

// ==================== EXPORT CSV ====================

function exportCSV() {
  if (currentUser.role !== "admin") return toast("Admin access required.");

  const rows = [
    ["Token", "Patient", "Doctor", "Department", "Date", "Time", "Consultation Type", "Reason", "Additional Details", "Status"],
    ...data.appointments.map(a => [
      a.token, a.patientName, a.doctorName, a.department,
      a.date, a.time, a.consultationType || "",
      a.reason || "", a.consultationDetails || "", a.status
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = "mediqueue-report.csv";
  link.click();

  URL.revokeObjectURL(url);
  toast("CSV report exported.");
}

// ==================== AUTHENTICATION EVENTS ====================

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

    const user = { id: "u-" + Date.now(), name, email, password, role };
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

// ==================== DEMO LOGIN BUTTONS ====================

$$("[data-demo]").forEach(button => {
  button.addEventListener("click", () => {
    const role = button.dataset.demo;
    const email = `${role}@demo.com`;

    $("#email").value = email;
    $("#password").value = "demo123";
    authTab("login");

    const user = data.users.find(u => u.email.toLowerCase() === email);

    if (user) {
      loginAs(user);
    } else {
      toast("Demo account not found. Reset demo data in Settings.");
    }
  });
});

// ==================== DASHBOARD EVENTS ====================

$("#logoutBtn").addEventListener("click", logout);
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

// ==================== PAGE BUTTON EVENTS ====================

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
    const appointment = data.appointments.find(a => a.id === cancel.dataset.cancel);

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

  if (event.target.closest("[data-close]")) return closeModal();
  if (event.target.closest("[data-add-doctor]")) return addDoctor();

  const toggle = event.target.closest("[data-toggle-doctor]");

  if (toggle) {
    if (currentUser.role !== "admin") return toast("Admin access required.");

    const doctor = doctorFor(toggle.dataset.toggleDoctor);

    if (doctor) {
      doctor.available = !doctor.available;
      saveData();
      renderPage();
      toast("Doctor availability updated.");
    }

    return;
  }

  if (event.target.closest("[data-export]")) return exportCSV();

  if (event.target.closest("[data-reset]")) {
    if (!confirm("Reset all demo data stored in this browser?")) return;

    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(SESSION_KEY);

    data = JSON.parse(JSON.stringify(initialData));
    saveData();

    currentUser = null;
    showAuth();
    toast("Demo data reset.");
  }
});

// ==================== FORM SUBMISSIONS ====================

$("#pageContent").addEventListener("submit", event => {
  if (event.target.id === "bookingForm") {
    return bookAppointment(event);
  }

  if (event.target.id === "profileForm") {
    event.preventDefault();

    const name = $("#profileName").value.trim();
    const email = $("#profileEmail").value.trim().toLowerCase();

    if (!name || !email) return toast("Name and email are required.");

    const duplicate = data.users.find(u =>
      u.email.toLowerCase() === email && u.id !== currentUser.id
    );

    if (duplicate) return toast("That email is already in use.");

    const user = data.users.find(u => u.id === currentUser.id);

    user.name = name;
    user.email = email;

    data.appointments.forEach(a => {
      if (a.patientId === user.id) a.patientName = name;
    });

    currentUser = { ...user };
    saveData();

    currentPage = "settings";
    showApp();
    toast("Profile updated.");
    return;
  }

  if (event.target.id === "addDoctorForm") {
    event.preventDefault();

    if (currentUser.role !== "admin") return toast("Admin access required.");

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

// ==================== INITIAL SETUP ====================

data.appointments.forEach(a => {
  if (!a.date) a.date = today();
});

saveData();

// Restore the last logged-in user and immediately show Overview.
const savedUserId = localStorage.getItem(SESSION_KEY);
const savedUser = data.users.find(u => u.id === savedUserId);

if (savedUser) {
  currentPage = "overview";
  loginAs(savedUser);
} else {
  showAuth();
}

}); // End DOMContentLoaded



/* ===== MEDIQUEUE HELP DESK ===== */
(function () {
  const helpStyle = document.createElement("style");

  helpStyle.textContent = `
    #mqHelpOverlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.65);
    }

    #mqHelpOverlay.mq-hidden {
      display: none;
    }

    #mqHelpModal {
      width: 100%;
      max-width: 460px;
      max-height: 90vh;
      overflow-y: auto;
      box-sizing: border-box;
      padding: 25px;
      border-radius: 18px;
      background: white;
      color: #202536;
      font-family: Arial, sans-serif;
      box-shadow: 0 15px 50px #0003;
    }

    #mqHelpModal h2 {
      margin-top: 0;
    }

    #mqHelpModal p {
      line-height: 1.6;
    }

    #mqHelpModal .mq-contact {
      background: #e8f7f5;
      border: 1px solid #bce6df;
      border-radius: 12px;
      padding: 15px;
      margin: 18px 0;
    }

    #mqHelpModal label {
      display: block;
      font-weight: bold;
      margin: 14px 0 7px;
    }

    #mqHelpModal input,
    #mqHelpModal textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #ccd2dd;
      border-radius: 8px;
      font: inherit;
    }

    #mqHelpModal textarea {
      min-height: 110px;
      resize: vertical;
    }

    #mqHelpModal button {
      padding: 11px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 15px;
    }

    #mqHelpClose {
      background: #e9edf3;
      color: #202536;
    }

    #mqHelpForm button[type="submit"] {
      background: #69c8b9;
      color: #102c32;
    }

    #mqHelpStatus {
      font-size: 13px;
      margin-top: 12px;
    }

    #helpDeskCard {
      cursor: pointer;
    }

    #helpDeskCard:hover {
      filter: brightness(1.08);
    }
  `;

  document.head.appendChild(helpStyle);

  const overlay = document.createElement("div");
  overlay.id = "mqHelpOverlay";
  overlay.className = "mq-hidden";

  overlay.innerHTML = `
    <section id="mqHelpModal" role="dialog"
      aria-modal="true" aria-labelledby="mqHelpTitle">

      <h2 id="mqHelpTitle">💬 Help Desk</h2>

      <p>
        Need help with appointments or using MediQueue?
        Send us your question using the form below.
      </p>

      <div class="mq-contact">
        <strong>📞 Hospital Help Desk</strong>
        <p>Demo contact: 1800-000-0000</p>
        <small>This is a sample number for the college project.</small>
      </div>

      <form id="mqHelpForm">
        <label for="mqHelpEmail">Your email (optional)</label>
        <input id="mqHelpEmail" type="email"
          placeholder="you@example.com">

        <label for="mqHelpMessage">Your message *</label>
        <textarea id="mqHelpMessage" required maxlength="1000"
          placeholder="Write your question here..."></textarea>

        <div id="mqHelpStatus" role="status"></div>

        <button type="button" id="mqHelpClose">Close</button>
        <button type="submit">Send Message</button>
      </form>
    </section>
  `;

  document.body.appendChild(overlay);

  function openHelp() {
    overlay.classList.remove("mq-hidden");
    document.getElementById("mqHelpMessage").focus();
  }

  function closeHelp() {
    overlay.classList.add("mq-hidden");
  }

  // Find the Need assistance / Need help card.
  function attachHelpCard() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    const elements = [
      ...sidebar.querySelectorAll("div, section, article")
    ];

    const card = elements.find(el => {
      const text = el.textContent || "";
      const hasTitle =
        text.includes("Need assistance?") ||
        text.includes("Need help?");

      return hasTitle &&
        text.includes("Contact the hospital front desk") &&
        !el.querySelector("#helpDeskCard");
    });

    if (card && !card.dataset.mqHelpAttached) {
      card.id = "helpDeskCard";
      card.dataset.mqHelpAttached = "true";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Open Help Desk");

      card.addEventListener("click", openHelp);

      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openHelp();
        }
      });
    }
  }

  attachHelpCard();

  // Retry in case the sidebar is rendered after this code runs.
  const observer = new MutationObserver(attachHelpCard);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  document.getElementById("mqHelpClose")
    .addEventListener("click", closeHelp);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeHelp();
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      !overlay.classList.contains("mq-hidden")
    ) {
      closeHelp();
    }
  });

  document.getElementById("mqHelpForm")
    .addEventListener("submit", event => {
      event.preventDefault();

      const email =
        document.getElementById("mqHelpEmail").value.trim();

      const message =
        document.getElementById("mqHelpMessage").value.trim();

      const status =
        document.getElementById("mqHelpStatus");

      if (!message) {
        status.textContent = "Please enter your message.";
        status.style.color = "#b42318";
        return;
      }

      let messages = [];

      try {
        messages = JSON.parse(
          localStorage.getItem("mediqueue_help_messages") || "[]"
        );

        if (!Array.isArray(messages)) messages = [];
      } catch {
        messages = [];
      }

      messages.push({
        id: Date.now(),
        email: email,
        message: message,
        date: new Date().toLocaleString()
      });

      localStorage.setItem(
        "mediqueue_help_messages",
        JSON.stringify(messages)
      );

      status.textContent =
        "Message saved successfully in this browser. It has not been sent to hospital staff.";

      status.style.color = "#18794e";

      document.getElementById("mqHelpMessage").value = "";
      document.getElementById("mqHelpEmail").value = "";
    });
})();
