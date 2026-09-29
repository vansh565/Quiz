/* ============================================================
   Professor Prabh — Admin Panel with Master Secret Key
   ============================================================ */

import { supabase } from './supabase.js'
import { state, render } from './state.js'
import * as db from './data.js'

// ============================================================
// MASTER SECRET KEY — Only this key can create admin accounts
// ============================================================
const MASTER_SECRET_KEY = '#Vsharma@105'

// ============================================================
// ADMIN LOGIN WITH MASTER SECRET KEY
// ============================================================
export function renderAdminLogin() {
  return `
    <div class="pp-landing">
      <div class="pp-landing-content" style="max-width:420px">
        <div class="pp-landing-logo" style="width:80px;height:80px;font-size:2.5rem">🔐</div>
        <h1 style="font-size:1.8rem">Admin Panel</h1>
        <p class="pp-landing-tagline">Professor Prabh Administration</p>
        <div class="pp-card pp-onboarding-card">
          <h2>Secure Access</h2>
          <p style="text-align:center;color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem">
            Enter your admin credentials and the secret key to access the panel.
          </p>
          <form id="pp-admin-login-form" autocomplete="on">
            <div class="pp-form-group">
              <label class="pp-label" for="pp-admin-email">Email</label>
              <input
                id="pp-admin-email"
                class="pp-input"
                type="text"
                name="email"
                required
                placeholder="admin@example.com"
                autocomplete="username"
                inputmode="email"
              />
            </div>
            <div class="pp-form-group">
              <label class="pp-label" for="pp-admin-password">Password</label>
              <input
                id="pp-admin-password"
                class="pp-input"
                type="password"
                name="password"
                required
                placeholder="Password"
                autocomplete="current-password"
              />
            </div>
            <div class="pp-form-group">
              <label class="pp-label" for="pp-admin-secret">🔑 Secret Key</label>
              <input
                id="pp-admin-secret"
                class="pp-input"
                type="password"
                name="secret_key"
                required
                placeholder="Enter your secret key"
              />
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">
                ⚠️ This is required for admin access
              </div>
            </div>
            <div id="pp-admin-login-error" class="pp-error-text pp-hidden"></div>
            <button type="submit" class="pp-btn pp-btn-primary pp-btn-block pp-btn-lg">Sign In</button>
          </form>
          <div class="pp-alert info pp-mt-2" style="font-size:0.85rem">
            <strong>First time?</strong> Contact the administrator to get your secret key.
          </div>
          <div class="pp-mt-2 pp-text-center">
            <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppToggleSignup()">Request Admin Access</button>
          </div>
          <div id="pp-admin-signup" class="pp-hidden pp-mt-2">
            <form id="pp-admin-signup-form">
              <div class="pp-alert info" style="margin-bottom:1rem;font-size:0.9rem">
                🔒 <strong>Admin Access Request</strong><br>
                You need the <strong>Master Secret Key</strong> to create an admin account.<br>
                Contact the system administrator to get the master key.
              </div>
              <div class="pp-form-group">
                <label class="pp-label">Full Name</label>
                <input class="pp-input" type="text" name="fullName" required placeholder="Your name" />
              </div>
              <div class="pp-form-group">
                <label class="pp-label">Email</label>
                <input class="pp-input" type="text" name="email" required placeholder="admin@example.com" autocomplete="username" />
              </div>
              <div class="pp-form-group">
                <label class="pp-label">Password</label>
                <input class="pp-input" type="password" name="password" required placeholder="Min 6 characters" minlength="6" />
              </div>
              <div class="pp-form-group">
                <label class="pp-label">🔑 Create Your Secret Key</label>
                <input class="pp-input" type="text" name="secret_key" required placeholder="Create a secret key" />
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">
                  ⚠️ Remember this key! You'll need it to access the admin panel.
                </div>
              </div>
              <div class="pp-form-group">
                <label class="pp-label">🔐 Master Secret Key</label>
                <input class="pp-input" type="password" name="master_key" required placeholder="Enter master secret key" />
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">
                  ⚠️ This is required to create an admin account
                </div>
              </div>
              <div id="pp-admin-signup-error" class="pp-error-text pp-hidden"></div>
              <button type="submit" class="pp-btn pp-btn-secondary pp-btn-block">Create Account</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
}

export function attachAdminLogin() {
  window.__ppToggleSignup = () => {
    document.getElementById('pp-admin-signup').classList.toggle('pp-hidden')
  }

  const loginForm = document.getElementById('pp-admin-login-form')
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(loginForm)
      const email = fd.get('email').trim()
      const password = fd.get('password')
      const secretKey = fd.get('secret_key').trim()
      const errEl = document.getElementById('pp-admin-login-error')
      errEl.classList.add('pp-hidden')

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const { data: profile, error: profErr } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', data.user.id)
          .eq('secret_key', secretKey)
          .maybeSingle()

        if (profErr || !profile) {
          await supabase.auth.signOut({ scope: 'local' })
          throw new Error('❌ Invalid credentials or secret key. Access denied.')
        }

        state.adminAuth = true
        state.adminSecretKey = secretKey
        render()
      } catch (err) {
        errEl.textContent = err.message
        errEl.classList.remove('pp-hidden')
      }
    })
  }

  const signupForm = document.getElementById('pp-admin-signup-form')
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(signupForm)
      const fullName = fd.get('fullName').trim()
      const email = fd.get('email').trim()
      const password = fd.get('password')
      const secretKey = fd.get('secret_key').trim()
      const masterKey = fd.get('master_key').trim()
      const errEl = document.getElementById('pp-admin-signup-error')
      errEl.classList.add('pp-hidden')

      if (masterKey !== MASTER_SECRET_KEY) {
        errEl.textContent = '❌ Invalid Master Secret Key! Access denied.'
        errEl.classList.remove('pp-hidden')
        return
      }

      if (secretKey.length < 6) {
        errEl.textContent = '❌ Secret key must be at least 6 characters long.'
        errEl.classList.remove('pp-hidden')
        return
      }

      try {
        const { data: existingStudent } = await supabase
          .from('students')
          .select('email')
          .eq('email', email)
          .maybeSingle()

        if (existingStudent) {
          errEl.textContent = '❌ This email is already registered as a student. Please use a different email.'
          errEl.classList.remove('pp-hidden')
          return
        }

        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user) {
          const { error: profErr } = await supabase
            .from('admin_profiles')
            .insert({
              id: data.user.id,
              full_name: fullName,
              email: email,
              secret_key: secretKey,
            })

          if (profErr) {
            throw new Error('Failed to create admin profile: ' + profErr.message)
          }

          alert('✅ Admin account created successfully! Please sign in with your secret key.')
          window.__ppToggleSignup()
        }
      } catch (err) {
        errEl.textContent = err.message
        errEl.classList.remove('pp-hidden')
      }
    })
  }
}

// ============================================================
// ADMIN LOGOUT
// ============================================================
export async function adminLogout() {
  await supabase.auth.signOut({ scope: 'local' })
  state.adminAuth = false
  state.adminSecretKey = null
  state.adminView = 'dashboard'
  render()
}

// ============================================================
// ADMIN LAYOUT
// ============================================================
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'students', label: 'Students', icon: '👥' },
  { id: 'courses', label: 'Courses & Chapters', icon: '📚' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'codes', label: 'Secret Codes', icon: '🔐' },
  { id: 'quizzes', label: 'Quizzes & Questions', icon: '📝' },
  { id: 'badges', label: 'Badges', icon: '🏆' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'activity', label: 'Student Activity', icon: '🕒' },
  { id: 'attempts', label: 'Quiz Attempts', icon: '📋' },
  { id: 'certificates', label: 'Certificates', icon: '📜' },
  { id: 'certificate-template', label: 'Certificate Template', icon: '🖼️' },
  { id: 'emails', label: 'Email Logs', icon: '📧' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function renderAdminPanel() {
  const navHTML = NAV_ITEMS.map(item => `
    <div class="pp-admin-nav-item ${state.adminView === item.id ? 'active' : ''}" onclick="window.__ppAdminNav('${item.id}')">
      <span>${item.icon}</span> ${item.label}
    </div>
  `).join('')

  return `
    <div class="pp-admin-layout">
      <button class="pp-admin-menu-toggle" onclick="document.querySelector('.pp-admin-sidebar').classList.toggle('open')">☰ Menu</button>
      <div class="pp-admin-sidebar">${navHTML}</div>
      <div class="pp-admin-content" id="pp-admin-content">
        <div class="pp-loading"><div class="pp-spinner"></div><span class="pp-loading-text">Loading...</span></div>
      </div>
    </div>
  `
}

export function attachAdminPanel() {
  window.__ppAdminNav = (view) => {
    state.adminView = view
    document.querySelectorAll('.pp-admin-nav-item').forEach(el => el.classList.remove('active'))
    render()
  }
  subscribeToStudentActivity()
  loadAdminContent()
}

let studentActivityChannel = null
function subscribeToStudentActivity() {
  if (studentActivityChannel) return
  studentActivityChannel = supabase
    .channel('admin-student-activity')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_activity' }, () => {
      if (state.adminAuth && ['dashboard', 'activity'].includes(state.adminView)) loadAdminContent()
    })
    .subscribe()
}

async function loadAdminContent() {
  const container = document.getElementById('pp-admin-content')
  if (!container) return
  container.innerHTML = '<div class="pp-loading"><div class="pp-spinner"></div><span class="pp-loading-text">Loading...</span></div>'

  try {
    let html = ''
    switch (state.adminView) {
      case 'dashboard': html = await renderAdminDashboard(); break
      case 'students': html = await renderAdminStudents(); break
      case 'courses': html = await renderAdminCourses(); break
      case 'videos': html = await renderAdminVideos(); break
      case 'codes': html = await renderAdminCodes(); break
      case 'quizzes': html = await renderAdminQuizzes(); break
      case 'badges': html = await renderAdminBadges(); break
      case 'games': html = await renderAdminGames(); break   
      case 'activity': html = await renderAdminStudentActivity(); break
      case 'attempts': html = await renderAdminAttempts(); break
      case 'certificates': html = await renderAdminCertificates(); break
      case 'certificate-template': html = await renderAdminCertificateTemplate(); break
      case 'emails': html = await renderAdminEmails(); break
      case 'settings': html = await renderAdminSettings(); break
      default: html = await renderAdminDashboard()
    }
    container.innerHTML = html
    attachAdminContentHandlers()
  } catch (err) {
    container.innerHTML = `<div class="pp-alert error">Error: ${err.message}</div>`
  }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function renderAdminDashboard() {
  const [courses, chapters, quizzes, questions, certs, attempts, emails, activityResult] = await Promise.all([
    db.getAllCourses().catch(() => []),
    db.getAllChapters().catch(() => []),
    db.getAllQuizzes().catch(() => []),
    db.getAllQuestions().catch(() => []),
    db.getAllCertificates().catch(() => []),
    db.getAllAttempts().catch(() => []),
    db.getAllEmailLogs().catch(() => []),
    db.getRecentStudentActivity(1000)
      .then(activity => ({ activity, error: null }))
      .catch(error => ({ activity: [], error })),
  ])
  const { activity, error: activityError } = activityResult
  const studentSessions = groupStudentSessions(activity)

  return `
    <h1 class="pp-admin-page-title">Dashboard</h1>
    <div class="pp-stats-grid">
      <div class="pp-stat-card"><div class="val">${studentSessions.length}</div><div class="label">Student Sessions</div></div>
      <div class="pp-stat-card"><div class="val">${courses.length}</div><div class="label">Courses</div></div>
      <div class="pp-stat-card"><div class="val">${chapters.length}</div><div class="label">Chapters</div></div>
      <div class="pp-stat-card"><div class="val">${questions.length}</div><div class="label">Questions</div></div>
    </div>
    <div class="pp-stats-grid">
      <div class="pp-stat-card"><div class="val">${quizzes.length}</div><div class="label">Quizzes</div></div>
      <div class="pp-stat-card"><div class="val">${attempts.length}</div><div class="label">Attempts</div></div>
      <div class="pp-stat-card"><div class="val">${certs.length}</div><div class="label">Certificates</div></div>
      <div class="pp-stat-card"><div class="val">${emails.length}</div><div class="label">Emails Sent</div></div>
    </div>
    <div class="pp-card pp-mt-2">
      <div class="pp-flex pp-justify-between pp-items-center">
        <h3>Recent Student Activity</h3>
        <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppAdminNav('activity')">View all</button>
      </div>
      ${activityError ? renderStudentActivityError(activityError) : renderStudentActivityTable(activity)}
    </div>
    <div class="pp-card pp-mt-2">
      <h3>Recent Student Sessions</h3>
      <table class="pp-admin-table">
        <thead><tr><th>Name</th><th>Class</th><th>Joined</th><th>Last Active</th><th>Attempts</th><th>Pass / Fail</th><th>Certificate</th></tr></thead>
        <tbody>
          ${studentSessions.slice(0, 5).map(s => renderStudentSessionRow(s)).join('') || '<tr><td colspan="7" class="pp-admin-empty">No student activity recorded yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

async function renderAdminStudentActivity() {
  let activity
  try {
    activity = await db.getRecentStudentActivity(100)
  } catch (error) {
    return `
      <h1 class="pp-admin-page-title">Student Activity</h1>
      ${renderStudentActivityError(error)}
    `
  }
  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Student Activity</h1>
      <span class="pp-badge-chip active">Live updates on</span>
    </div>
    <div class="pp-card">
      ${renderStudentActivityTable(activity)}
    </div>
  `
}

function escapeActivityText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
}

function renderStudentActivityError(error) {
  const message = error?.message || String(error)
  const migrationMissing = /student_activity|schema cache|PGRST202/i.test(message)
  return `
    <div class="pp-alert error">
      ${migrationMissing
        ? 'Student activity storage is not installed. Run supabase/migrations/20260928170000_student_activity_realtime.sql in the Supabase SQL Editor, then reload this page.'
        : `Could not load student activity: ${escapeActivityText(message)}`}
    </div>
  `
}

function renderStudentActivityTable(activity) {
  const rows = activity.map(item => {
    const eventLabel = item.event_type === 'student_started'
      ? 'Started learning'
      : item.event_type === 'certificate_awarded'
        ? 'Certificate awarded'
        : 'Quiz attempt'
    const detail = item.event_type === 'certificate_awarded'
      ? `Certificate ${item.certificate_number || ''}`
      : [item.quiz_title, item.chapter_title].filter(Boolean).join(' · ')
    const outcome = item.event_type === 'quiz_attempt'
      ? item.passed ? 'PASS' : 'FAIL'
      : item.event_type === 'certificate_awarded' ? 'AWARDED' : '—'
    const outcomeClass = item.passed || item.event_type === 'certificate_awarded' ? 'active' : 'inactive'
    const answerDetails = Array.isArray(item.answer_details) && item.answer_details.length
      ? `<details><summary>${item.answer_details.length} answer details</summary><ol style="padding-left:1.25rem;margin-top:0.5rem">${item.answer_details.map(answer => `
          <li style="margin-bottom:0.6rem">
            <strong>${escapeActivityText(answer.question)}</strong><br>
            Your answer: ${escapeActivityText(answer.selected_text || 'Not answered')}<br>
            Correct answer: ${escapeActivityText(answer.correct_text || answer.correct_answer || '—')}
            <span class="pp-badge-chip ${answer.is_correct ? 'active' : 'inactive'}">${answer.is_correct ? 'Correct' : 'Incorrect'}</span>
          </li>
        `).join('')}</ol></details>`
      : ''

    return `
      <tr>
        <td><strong>${escapeActivityText(item.student_name)}</strong></td>
        <td>${escapeActivityText(item.class_level || '—')}</td>
        <td>${eventLabel}</td>
        <td>${escapeActivityText(detail || '—')}${answerDetails}</td>
        <td><span class="pp-badge-chip ${outcomeClass}">${outcome}</span></td>
        <td>${item.score_percentage == null ? '—' : `${escapeActivityText(item.score_percentage)}%`}</td>
        <td>${item.total_questions == null ? '—' : `${escapeActivityText(item.correct_count ?? 0)} / ${escapeActivityText(item.wrong_count ?? 0)} / ${escapeActivityText(item.total_questions)}`}</td>
        <td>${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
      </tr>
    `
  }).join('')

  return `
    <div style="overflow-x:auto">
      <table class="pp-admin-table">
        <thead><tr><th>Student</th><th>Class</th><th>Activity</th><th>Details</th><th>Result</th><th>Score</th><th>Correct / Wrong / Total</th><th>Date & Time</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" class="pp-admin-empty">No student activity recorded yet</td></tr>'}</tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN STUDENTS
// ============================================================
let studentSearch = ''
async function renderAdminStudents() {
  let activity
  try {
    activity = await db.getRecentStudentActivity(1000)
  } catch (error) {
    return `
      <h1 class="pp-admin-page-title">Students</h1>
      ${renderStudentActivityError(error)}
    `
  }
  const sessions = groupStudentSessions(activity).filter(student =>
    !studentSearch || student.name.toLowerCase().includes(studentSearch.toLowerCase())
  )
  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Students</h1>
      <input class="pp-search-input" type="text" placeholder="Search by name..." value="${studentSearch}" id="pp-student-search" />
    </div>
    <div class="pp-card">
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem">Each row is one student visit. Returning students appear as new sessions.</p>
      <table class="pp-admin-table">
        <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Joined</th><th>Last Active</th><th>Attempts</th><th>Pass / Fail</th><th>Certificate</th></tr></thead>
        <tbody>
          ${sessions.map((student, index) => renderStudentSessionRow(student, index + 1)).join('') || '<tr><td colspan="8" class="pp-admin-empty">No student activity found</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

function groupStudentSessions(activity) {
  const sessions = new Map()
  activity.forEach(item => {
    const sessionId = item.session_id || item.id
    let student = sessions.get(sessionId)
    if (!student) {
      student = {
        name: item.student_name || 'Student',
        classLevel: item.class_level || '—',
        joinedAt: item.created_at,
        lastActive: item.created_at,
        attempts: 0,
        passed: 0,
        failed: 0,
        certificateNumbers: [],
      }
      sessions.set(sessionId, student)
    }

    if (item.created_at) {
      if (!student.joinedAt || item.created_at < student.joinedAt) student.joinedAt = item.created_at
      if (!student.lastActive || item.created_at > student.lastActive) student.lastActive = item.created_at
    }
    if (item.event_type === 'student_started') student.joinedAt = item.created_at
    if (item.event_type === 'quiz_attempt') {
      student.attempts++
      if (item.passed) student.passed++
      else student.failed++
    }
    if (item.event_type === 'certificate_awarded' && item.certificate_number) {
      student.certificateNumbers.push(item.certificate_number)
    }
  })

  return [...sessions.values()].sort((first, second) =>
    new Date(second.lastActive || 0) - new Date(first.lastActive || 0)
  )
}

function renderStudentSessionRow(student, number = null) {
  const certificate = student.certificateNumbers.length
    ? student.certificateNumbers.map(escapeActivityText).join(', ')
    : '—'
  return `
    <tr>
      ${number === null ? '' : `<td>${number}</td>`}
      <td><strong>${escapeActivityText(student.name)}</strong></td>
      <td>${escapeActivityText(student.classLevel)}</td>
      <td>${student.joinedAt ? new Date(student.joinedAt).toLocaleString() : '—'}</td>
      <td>${student.lastActive ? new Date(student.lastActive).toLocaleString() : '—'}</td>
      <td>${student.attempts}</td>
      <td>${student.passed} / ${student.failed}</td>
      <td>${certificate}</td>
    </tr>
  `
}

// ============================================================
// ADMIN COURSES & CHAPTERS
// ============================================================
async function renderAdminCourses() {
  const [courses, chapters] = await Promise.all([
    db.getAllCourses(),
    db.getAllChapters(),
  ])

  const coursesHTML = courses.map(c => `
    <div class="pp-card pp-mb-2">
      <div class="pp-flex pp-justify-between pp-items-center">
        <div>
          <strong>${c.name}</strong> 
          <span class="pp-badge-chip ${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span>
          <div style="font-size:0.85rem;color:var(--text-muted)">${c.class_level}</div>
        </div>
        <div class="pp-flex pp-gap-1">
          <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditCourse('${c.id}')">Edit</button>
          <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppToggleCourse('${c.id}', ${!c.is_active})">${c.is_active ? 'Disable' : 'Enable'}</button>
          <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteCourse('${c.id}')">Delete</button>
        </div>
      </div>
      <div class="pp-mt-2">
        <strong style="font-size:0.85rem;color:var(--gray-600)">Chapters:</strong>
        ${chapters.filter(ch => ch.course_id === c.id).map(ch => `
          <div class="pp-flex pp-justify-between pp-items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--border)">
            <div>${ch.sort_order || 0}. ${ch.title} 
              <span class="pp-badge-chip ${ch.is_active ? 'active' : 'inactive'}">${ch.is_active ? 'Active' : 'Inactive'}</span>
              ${ch.youtube_url ? '<span class="pp-badge-chip active" style="margin-left:0.25rem">🎬 Video</span>' : ''}
            </div>
            <div class="pp-flex pp-gap-1">
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditChapter('${ch.id}')">Edit</button>
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppToggleChapter('${ch.id}', ${!ch.is_active})">${ch.is_active ? 'Disable' : 'Enable'}</button>
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteChapter('${ch.id}')">Delete</button>
            </div>
          </div>
        `).join('') || '<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem 0">No chapters</div>'}
        <button class="pp-btn pp-btn-secondary pp-btn-sm pp-mt-1" onclick="window.__ppAddChapter('${c.id}')">+ Add Chapter</button>
      </div>
    </div>
  `).join('')

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Courses & Chapters</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddCourse()">+ Add Course</button>
    </div>
    ${coursesHTML || '<div class="pp-admin-empty">No courses yet</div>'}
  `
}

// ============================================================
// ADMIN VIDEOS
// ============================================================
async function renderAdminVideos() {
  const [videos, chapters] = await Promise.all([
    db.getAllVideos(),
    db.getAllChapters(),
  ])

  const chapterMap = {}
  chapters.forEach(ch => { chapterMap[ch.id] = ch })

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Videos</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddVideo()">+ Add Video</button>
    </div>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Title</th><th>Chapter</th><th>YouTube ID</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${videos.map(v => `
            <tr>
              <td>${v.title}</td>
              <td>${chapterMap[v.chapter_id]?.title || '—'}</td>
              <td style="font-family:monospace;font-size:0.85rem">${v.youtube_id || '—'}</td>
              <td><span class="pp-badge-chip ${v.is_active ? 'active' : 'inactive'}">${v.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditVideo('${v.id}')">Edit</button>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteVideo('${v.id}')">Delete</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="pp-admin-empty">No videos yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN SECRET CODES  ✅ FIXED — shows chapter name
// ============================================================
async function renderAdminCodes() {
  const [codes, chapters] = await Promise.all([
    db.getAllSecretCodes(),
    db.getAllChapters(),
  ])

  // Build lookup map in case join fails
  const chapterMap = {}
  chapters.forEach(ch => { chapterMap[ch.id] = ch })

  // Group codes by chapter
  const codesByChapter = {}
  codes.forEach(c => {
    if (!codesByChapter[c.chapter_id]) codesByChapter[c.chapter_id] = []
    codesByChapter[c.chapter_id].push(c)
  })

  // Chapters WITHOUT a code
  const chaptersWithoutCodes = chapters.filter(ch => !codesByChapter[ch.id])

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Secret Codes</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddCode()">+ Add Secret Code</button>
    </div>

    ${chaptersWithoutCodes.length > 0 ? `
      <div class="pp-card pp-mb-2" style="background:#fef3c7;border:1px solid #f59e0b">
        <strong style="color:#92400e">⚠️ Chapters without a secret code (${chaptersWithoutCodes.length}):</strong>
        <div style="margin-top:0.5rem;font-size:0.9rem">
          ${chaptersWithoutCodes.map(ch => `
            <span style="display:inline-block;background:#fff;padding:0.25rem 0.75rem;border-radius:20px;margin:0.25rem;border:1px solid #fdba74">
              ${ch.title}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Code</th><th>Chapter</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${codes.map(c => {
            const chapterTitle =
              c.chapters?.title ||
              chapterMap[c.chapter_id]?.title ||
              (c.chapter_id ? `Chapter ${String(c.chapter_id).slice(0, 8)}…` : '—')
            return `
              <tr>
                <td style="font-family:monospace;font-weight:700">${c.code}</td>
                <td>${chapterTitle}</td>
                <td><span class="pp-badge-chip ${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppToggleCode('${c.id}', ${!c.is_active})">${c.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteCode('${c.id}')">Delete</button>
                </td>
              </tr>
            `
          }).join('') || '<tr><td colspan="4" class="pp-admin-empty">No secret codes yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN QUIZZES & QUESTIONS  ✅ FIXED — shows chapter name
// ============================================================
async function renderAdminQuizzes() {
  const [quizzes, questions, chapters] = await Promise.all([
    db.getAllQuizzes(),
    db.getAllQuestions(),
    db.getAllChapters(),
  ])

  const chapterMap = {}
  chapters.forEach(ch => { chapterMap[ch.id] = ch })

  const quizzesHTML = quizzes.map(q => {
    const chapter = q.chapters || chapterMap[q.chapter_id]
    const qCount = questions.filter(qu => qu.quiz_id === q.id).length
    return `
      <div class="pp-card pp-mb-2">
        <div class="pp-flex pp-justify-between pp-items-center">
          <div>
            <strong>${q.title}</strong> 
            <span class="pp-badge-chip ${q.is_active ? 'active' : 'inactive'}">${q.is_active ? 'Active' : 'Inactive'}</span>
            <div style="font-size:0.85rem;color:var(--text-muted)">
              ${chapter?.title || '—'} • Pass: ${q.passing_percentage}% • Max: ${q.max_questions} questions • Attempts: ${q.max_attempts || 'Unlimited'} • ${qCount} questions
            </div>
          </div>
          <div class="pp-flex pp-gap-1">
            <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditQuiz('${q.id}')">Edit</button>
            <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppManageQuestions('${q.id}')">Questions (${qCount})</button>
            <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteQuiz('${q.id}')">Delete</button>
          </div>
        </div>
      </div>
    `
  }).join('')

  const chaptersWithoutQuiz = chapters.filter(ch => !quizzes.some(q => q.chapter_id === ch.id))

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Quizzes & Questions</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddQuiz()">+ Add Quiz</button>
    </div>

    ${chaptersWithoutQuiz.length > 0 ? `
      <div class="pp-card pp-mb-2" style="background:#fef3c7;border:1px solid #f59e0b">
        <strong style="color:#92400e">⚠️ Chapters without a quiz (${chaptersWithoutQuiz.length}):</strong>
        <div style="margin-top:0.5rem;font-size:0.9rem">
          ${chaptersWithoutQuiz.map(ch => `
            <span style="display:inline-block;background:#fff;padding:0.25rem 0.75rem;border-radius:20px;margin:0.25rem;border:1px solid #fdba74">
              ${ch.title}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${quizzesHTML || '<div class="pp-admin-empty">No quizzes yet</div>'}
  `
}

// ============================================================
// ADMIN BADGES  ✅ FIXED — shows chapter name
// ============================================================
async function renderAdminBadges() {
  const [badges, chapters] = await Promise.all([
    db.getAllBadges(),
    db.getAllChapters(),
  ])

  const chapterMap = {}
  chapters.forEach(ch => { chapterMap[ch.id] = ch })

  const chaptersWithoutBadge = chapters.filter(ch => !badges.some(b => b.chapter_id === ch.id))

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Badges</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddBadge()">+ Add Badge</button>
    </div>

    ${chaptersWithoutBadge.length > 0 ? `
      <div class="pp-card pp-mb-2" style="background:#fef3c7;border:1px solid #f59e0b">
        <strong style="color:#92400e">⚠️ Chapters without a badge (${chaptersWithoutBadge.length}):</strong>
        <div style="margin-top:0.5rem;font-size:0.9rem">
          ${chaptersWithoutBadge.map(ch => `
            <span style="display:inline-block;background:#fff;padding:0.25rem 0.75rem;border-radius:20px;margin:0.25rem;border:1px solid #fdba74">
              ${ch.title}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="pp-chapters-grid">
      ${badges.map(b => {
        const chapter = b.chapters || chapterMap[b.chapter_id]
        return `
          <div class="pp-card pp-text-center">
            <div style="font-size:3rem;margin-bottom:0.5rem">🏆</div>
            <strong>${b.name}</strong>
            <div style="font-size:0.85rem;color:var(--text-muted);margin:0.3rem 0">${b.description || ''}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Chapter: ${chapter?.title || '—'}</div>
            <div class="pp-mt-1">
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditBadge('${b.id}')">Edit</button>
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteBadge('${b.id}')">Delete</button>
            </div>
          </div>
        `
      }).join('') || '<div class="pp-admin-empty">No badges yet</div>'}
    </div>
  `
}

// ============================================================
// ADMIN ATTEMPTS
// ============================================================
async function renderAdminAttempts() {
  const attempts = await db.getAllAttempts()
  return `
    <h1 class="pp-admin-page-title">Quiz Attempts</h1>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>%</th><th>Result</th><th>Date</th></tr></thead>
        <tbody>
          ${attempts.map(a => `
            <tr>
              <td>${a.students?.name || '—'}</td>
              <td>${a.quizzes?.title || '—'}</td>
              <td>${a.correct_count}/${a.total_questions}</td>
              <td>${a.score_percentage}%</td>
              <td><span class="pp-badge-chip ${a.passed ? 'active' : 'inactive'}">${a.passed ? 'PASS' : 'FAIL'}</span></td>
              <td>${new Date(a.created_at || a.attempted_at).toLocaleDateString()}</td>
            </tr>
          `).join('') || '<tr><td colspan="6" class="pp-admin-empty">No attempts yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN CERTIFICATES
// ============================================================
let certSearch = ''
async function renderAdminCertificates() {
  const certs = await db.getAllCertificates(certSearch)
  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Certificates</h1>
      <input class="pp-search-input" type="text" placeholder="Search by cert number or name..." value="${certSearch}" id="pp-cert-search" />
    </div>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Cert Number</th><th>Student</th><th>Class</th><th>Program</th><th>Date</th></tr></thead>
        <tbody>
          ${certs.map(c => `
            <tr>
              <td style="font-family:monospace;font-weight:700">${c.certificate_number}</td>
              <td>${c.student_name}</td>
              <td>${c.class_level}</td>
              <td>${c.program_name}</td>
              <td>${new Date(c.issued_date).toLocaleDateString()}</td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="pp-admin-empty">No certificates yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN EMAIL LOGS
// ============================================================
async function renderAdminEmails() {
  let logs = []
  let fetchError = null

  try {
    logs = await db.getAllEmailLogs()
    if (!Array.isArray(logs)) logs = []
  } catch (err) {
    console.error('Email logs fetch error:', err)
    fetchError = err.message || String(err)
    logs = []
  }

  if (fetchError) {
    return `
      <h1 class="pp-admin-page-title">Email Logs</h1>
      <div class="pp-card" style="text-align:center;padding:2rem">
        <div style="font-size:3rem;margin-bottom:0.5rem">⚠️</div>
        <h3 style="margin:0 0 0.5rem">Could not load email logs</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;margin:0.5rem 0">${fetchError}</p>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:1rem">
          Make sure the <code>email_logs</code> table exists in your database.
        </p>
      </div>
    `
  }

  if (logs.length === 0) {
    return `
      <h1 class="pp-admin-page-title">Email Logs</h1>
      <div class="pp-card" style="text-align:center;padding:2rem">
        <div style="font-size:3rem;margin-bottom:0.5rem">📭</div>
        <h3 style="margin:0 0 0.5rem">No emails sent yet</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;margin:0">
          When you send certificate or badge emails to students, they will appear here.
        </p>
      </div>
    `
  }

  return `
    <h1 class="pp-admin-page-title">Email Logs</h1>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Type</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td><span class="pp-badge-chip ${l.email_type === 'badge' ? 'active' : 'inactive'}">${l.email_type || '—'}</span></td>
              <td>${l.recipient_email || '—'}</td>
              <td>${l.subject || '—'}</td>
              <td><span class="pp-badge-chip ${l.status === 'sent' ? 'active' : 'inactive'}">${l.status || '—'}</span></td>
              <td>${l.sent_at ? new Date(l.sent_at).toLocaleDateString() : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN SETTINGS
// ============================================================
async function renderAdminSettings() {
  const settings = await db.getPlatformSettings()
  return `
    <h1 class="pp-admin-page-title">Platform Settings</h1>
    <div class="pp-card" style="max-width:500px">
      <form id="pp-settings-form">
        <div class="pp-form-group">
          <label class="pp-label">Platform Name</label>
          <input class="pp-input" type="text" name="platform_name" value="${settings.platform_name || 'Professor Prabh'}" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Default Passing Percentage</label>
          <input class="pp-input" type="number" name="default_passing_percentage" value="${settings.default_passing_percentage || 80}" min="0" max="100" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Default Max Questions</label>
          <input class="pp-input" type="number" name="default_max_questions" value="${settings.default_max_questions || 10}" min="1" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Default Max Attempts</label>
          <input class="pp-input" type="number" name="default_max_attempts" value="${settings.default_max_attempts || ''}" min="1" placeholder="Leave blank for unlimited" />
        </div>
        <button type="submit" class="pp-btn pp-btn-primary">Save Settings</button>
      </form>
    </div>
  `
}

async function renderAdminCertificateTemplate() {
  const settings = await db.getPlatformSettings()
  const templateUrl = settings.certificate_template_url || ''
  return `
    <h1 class="pp-admin-page-title">Certificate Template</h1>
    <div class="pp-card" style="max-width:760px">
      <p style="color:var(--text-muted);margin-bottom:1rem">
        Upload a landscape PNG, JPG, or WebP certificate background. The student name is placed below the presentation line, the completed course covers the course placeholder, and the issue date and certificate number are added near the bottom. Remove sample names, course names, and dates from the image first; text already baked into an image cannot be edited.
      </p>
      ${templateUrl ? `
        <div style="margin-bottom:1.25rem">
          <strong style="display:block;margin-bottom:0.5rem">Current template</strong>
          <img src="${escapeActivityText(templateUrl)}" alt="Current certificate template preview" style="display:block;width:100%;max-height:420px;object-fit:contain;background:#f3f4f6;border:1px solid var(--border);border-radius:8px" />
        </div>
      ` : '<div class="pp-alert info">No template uploaded. The default certificate design will be used.</div>'}
      <form id="pp-certificate-template-form">
        <div class="pp-form-group">
          <label class="pp-label" for="pp-certificate-template-file">Certificate background image</label>
          <input class="pp-input" id="pp-certificate-template-file" type="file" name="template" accept="image/png,image/jpeg,image/webp" required />
          <div class="pp-form-hint">PNG, JPG, or WebP. Maximum file size: 5 MB.</div>
        </div>
        <div id="pp-certificate-template-error" class="pp-error-text pp-hidden"></div>
        <div class="pp-flex pp-gap-1 pp-flex-wrap">
          <button class="pp-btn pp-btn-primary" type="submit">Upload Template</button>
          ${templateUrl ? '<button class="pp-btn pp-btn-secondary" id="pp-remove-certificate-template" type="button">Remove Template</button>' : ''}
        </div>
      </form>
    </div>
  `
}

// ============================================================
// MODAL HELPERS
// ============================================================
function showModal(title, content) {
  const overlay = document.createElement('div')
  overlay.className = 'pp-modal-overlay'
  overlay.id = 'pp-modal-overlay'
  overlay.innerHTML = `
    <div class="pp-modal">
      <div class="pp-modal-header">
        <h2>${title}</h2>
        <button class="pp-modal-close" onclick="document.getElementById('pp-modal-overlay').remove()">✕</button>
      </div>
      <div id="pp-modal-body">${content}</div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `pp-toast ${type}`
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// Extract YouTube ID from any URL
function extractYoutubeId(url) {
  if (!url) return ''
  url = String(url).trim()
  if (/^[\w-]{11}$/.test(url)) return url
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)
  return m ? m[1] : ''
}

// ============================================================
// 🔥 BULK QUESTION PARSER
// ============================================================
function parseBulkQuestions(text) {
  const questions = []
  const errors = []

  const raw = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return { questions, errors: ['Empty input'] }

  let blocks = raw.split(/\n\s*\n+/)

  if (blocks.length === 1) {
    blocks = raw.split(/(?=^\s*(?:Q\s*\d*\s*[\.\):]|Question\s*\d*\s*[\.\):]|\d+\s*[\.\):])\s*)/mi)
  }

  blocks.forEach((block, idx) => {
    const b = block.trim()
    if (!b) return

    const lines = b.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 3) return

    let questionText = ''
    const options = { a: '', b: '', c: '', d: '' }
    let correctLetter = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      let ansMatch = line.match(/^(?:Ans(?:wer)?|Correct(?:\s*Answer)?|Sol(?:ution)?)\s*[:\-]\s*([A-Da-d])/i)
      if (ansMatch) {
        correctLetter = ansMatch[1].toLowerCase()
        continue
      }
      ansMatch = line.match(/^(?:Ans(?:wer)?|Correct)\s*[:\-]\s*([A-Da-d])\s*[\).:]?/i)
      if (ansMatch) {
        correctLetter = ansMatch[1].toLowerCase()
        continue
      }

      const optMatch = line.match(/^\(?\s*([A-Da-d])\s*[\).\]:\-]\s*(.+)$/)
      if (optMatch) {
        const letter = optMatch[1].toLowerCase()
        const text = optMatch[2].trim()
        if (/^[A-Da-d]$/.test(letter) && text.length > 0) {
          options[letter] = text
          continue
        }
      }

      if (!questionText) {
        questionText = line
          .replace(/^\s*(?:Q\s*\d*\s*[\.\):]|Question\s*\d*\s*[\.\):]|\d+\s*[\.\):])\s*/i, '')
          .trim()
      } else if (!options.a && !options.b && !options.c && !options.d) {
        questionText += ' ' + line
      }
    }

    const missing = []
    if (!questionText) missing.push('question text')
    if (!options.a) missing.push('option A')
    if (!options.b) missing.push('option B')
    if (!options.c) missing.push('option C')
    if (!options.d) missing.push('option D')
    if (!correctLetter) missing.push('correct answer')
    if (correctLetter && !options[correctLetter]) {
      missing.push(`answer letter "${correctLetter}" but no such option`)
    }

    if (missing.length > 0) {
      errors.push(`Block ${idx + 1}: missing ${missing.join(', ')}`)
      return
    }

    questions.push({
      question_text: questionText,
      option_a: options.a,
      option_b: options.b,
      option_c: options.c,
      option_d: options.d,
      correct_answer: correctLetter,
      explanation: '',
      sort_order: questions.length + 1,
      is_active: true,
    })
  })

  return { questions, errors }
}

// ============================================================
// ADMIN CONTENT HANDLERS
// ============================================================
function attachAdminContentHandlers() {
  attachGameHandlers()

  const studentSearchEl = document.getElementById('pp-student-search')
  if (studentSearchEl) {
    studentSearchEl.addEventListener('input', (e) => {
      studentSearch = e.target.value
      loadAdminContent()
    })
  }

  const certSearchEl = document.getElementById('pp-cert-search')
  if (certSearchEl) {
    certSearchEl.addEventListener('input', (e) => {
      certSearch = e.target.value
      loadAdminContent()
    })
  }

  const settingsForm = document.getElementById('pp-settings-form')
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(settingsForm)
      try {
        for (const [key, value] of fd.entries()) {
          await db.updatePlatformSetting(key, value)
        }
        showToast('Settings saved successfully!', 'success')
        loadAdminContent()
      } catch (err) {
        showToast('Error: ' + err.message, 'error')
      }
    })
  }

  const certificateTemplateForm = document.getElementById('pp-certificate-template-form')
  if (certificateTemplateForm) {
    certificateTemplateForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const file = certificateTemplateForm.elements.template.files[0]
      const errorElement = document.getElementById('pp-certificate-template-error')
      const submitButton = certificateTemplateForm.querySelector('button[type="submit"]')
      errorElement.classList.add('pp-hidden')
      submitButton.disabled = true

      let uploadedPath = null
      try {
        if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          throw new Error('Choose a PNG, JPG, or WebP image.')
        }
        if (file.size > 5 * 1024 * 1024) throw new Error('The template image must be 5 MB or smaller.')

        const settings = await db.getPlatformSettings()
        const oldPath = settings.certificate_template_path
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        uploadedPath = `templates/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('certificate-templates')
          .upload(uploadedPath, file, { contentType: file.type, cacheControl: '3600' })
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('certificate-templates').getPublicUrl(uploadedPath)
        try {
          await db.updatePlatformSetting('certificate_template_path', uploadedPath)
          await db.updatePlatformSetting('certificate_template_url', data.publicUrl)
        } catch (error) {
          await supabase.storage.from('certificate-templates').remove([uploadedPath])
          throw error
        }

        if (oldPath) await supabase.storage.from('certificate-templates').remove([oldPath])
        showToast('Certificate template saved!', 'success')
        loadAdminContent()
      } catch (error) {
        const message = error.message || 'Could not upload certificate template.'
        errorElement.textContent = /bucket not found/i.test(message)
          ? 'Certificate storage is not installed. Run supabase/migrations/20260929110000_certificate_templates.sql in the Supabase SQL Editor, then reload this page.'
          : message
        errorElement.classList.remove('pp-hidden')
        submitButton.disabled = false
      }
    })
  }

  const removeCertificateTemplateButton = document.getElementById('pp-remove-certificate-template')
  if (removeCertificateTemplateButton) {
    removeCertificateTemplateButton.addEventListener('click', async () => {
      if (!confirm('Remove the certificate template and return to the default design?')) return
      try {
        const settings = await db.getPlatformSettings()
        if (settings.certificate_template_path) {
          const { error } = await supabase.storage
            .from('certificate-templates')
            .remove([settings.certificate_template_path])
          if (error) throw error
        }
        await db.updatePlatformSetting('certificate_template_path', '')
        await db.updatePlatformSetting('certificate_template_url', '')
        showToast('Certificate template removed.', 'success')
        loadAdminContent()
      } catch (error) {
        showToast('Error: ' + error.message, 'error')
      }
    })
  }

  // ============================================================
  // COURSE CRUD
  // ============================================================
  window.__ppAddCourse = async () => {
    showModal('Add Course', `
      <form id="pp-modal-form">
        <div class="pp-form-group">
          <label class="pp-label">Course Name</label>
          <input class="pp-input" type="text" name="name" required placeholder="Class 7 Physics" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Class Level</label>
          <input class="pp-input" type="text" name="class_level" required placeholder="Class 7" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Description</label>
          <textarea class="pp-textarea" name="description" placeholder="Course description..."></textarea>
        </div>
        <div class="pp-form-group">
          <label><input type="checkbox" name="is_active" checked /> Active</label>
        </div>
        <div class="pp-modal-footer">
          <button type="submit" class="pp-btn pp-btn-primary">Create Course</button>
        </div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = {}
      fd.forEach((v, k) => { row[k] = v })
      row.is_active = row.is_active === 'on'
      try {
        await db.adminInsert('courses', row)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Course created!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppEditCourse = async (id) => {
    const courses = await db.getAllCourses()
    const c = courses.find(x => x.id === id)
    if (!c) return
    showModal('Edit Course', `
      <form id="pp-modal-form">
        <div class="pp-form-group"><label>Name</label><input class="pp-input" type="text" name="name" value="${c.name}" required /></div>
        <div class="pp-form-group"><label>Class Level</label><input class="pp-input" type="text" name="class_level" value="${c.class_level}" required /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description">${c.description || ''}</textarea></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" ${c.is_active ? 'checked' : ''} /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Save</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const updates = {}
      fd.forEach((v, k) => { updates[k] = v })
      updates.is_active = updates.is_active === 'on'
      try {
        await db.adminUpdate('courses', id, updates)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Course updated!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppToggleCourse = async (id, newVal) => {
    try { await db.adminUpdate('courses', id, { is_active: newVal }); showToast('Course updated!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  window.__ppDeleteCourse = async (id) => {
    if (!confirm('Delete this course and all its chapters?')) return
    try { await db.adminDelete('courses', id); showToast('Course deleted!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  // ============================================================
  // CHAPTER CRUD
  // ============================================================
  window.__ppAddChapter = async (courseId) => {
    const chapters = await db.getAllChapters()
    const courseChapters = chapters.filter(c => c.course_id === courseId)
    showModal('Add Chapter', `
      <form id="pp-modal-form">
        <div class="pp-form-group"><label>Title</label><input class="pp-input" type="text" name="title" required placeholder="Chapter title" /></div>
        <div class="pp-form-group"><label>Slug</label><input class="pp-input" type="text" name="slug" required placeholder="chapter-slug" /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description"></textarea></div>
        <div class="pp-form-group">
          <label>🎬 YouTube URL (optional)</label>
          <input class="pp-input" type="text" name="youtube_url" placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div class="pp-form-group"><label>Sort Order</label><input class="pp-input" type="number" name="sort_order" value="${courseChapters.length + 1}" required /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" checked /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Create Chapter</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = { course_id: courseId }
      fd.forEach((v, k) => { row[k] = v })
      row.is_active = row.is_active === 'on'
      row.sort_order = parseInt(row.sort_order)
      try {
        await db.adminInsert('chapters', row)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Chapter created!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppEditChapter = async (id) => {
    const chapters = await db.getAllChapters()
    const ch = chapters.find(x => x.id === id)
    if (!ch) return
    showModal('Edit Chapter', `
      <form id="pp-modal-form">
        <div class="pp-form-group"><label>Title</label><input class="pp-input" type="text" name="title" value="${ch.title}" required /></div>
        <div class="pp-form-group"><label>Slug</label><input class="pp-input" type="text" name="slug" value="${ch.slug}" required /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description">${ch.description || ''}</textarea></div>
        <div class="pp-form-group">
          <label>🎬 YouTube URL</label>
          <input class="pp-input" type="text" name="youtube_url" value="${ch.youtube_url || ''}" placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div class="pp-form-group"><label>Sort Order</label><input class="pp-input" type="number" name="sort_order" value="${ch.sort_order || 0}" required /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" ${ch.is_active ? 'checked' : ''} /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Save</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const updates = {}
      fd.forEach((v, k) => { updates[k] = v })
      updates.is_active = updates.is_active === 'on'
      updates.sort_order = parseInt(updates.sort_order)
      try {
        await db.adminUpdate('chapters', id, updates)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Chapter updated!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppToggleChapter = async (id, newVal) => {
    try { await db.adminUpdate('chapters', id, { is_active: newVal }); showToast('Chapter updated!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  window.__ppDeleteChapter = async (id) => {
    if (!confirm('Delete this chapter?')) return
    try { await db.adminDelete('chapters', id); showToast('Chapter deleted!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  // ============================================================
  // VIDEO CRUD
  // ============================================================
  window.__ppAddVideo = async () => {
    const chapters = await db.getAllChapters()
    showModal('Add Video', `
      <form id="pp-modal-form">
        <div class="pp-form-group">
          <label>Chapter</label>
          <select class="pp-select" name="chapter_id" required>
            ${chapters.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
          </select>
        </div>
        <div class="pp-form-group"><label>Title</label><input class="pp-input" type="text" name="title" required placeholder="Video title" /></div>
        <div class="pp-form-group"><label>YouTube URL</label><input class="pp-input" type="text" name="youtube_url" required placeholder="https://www.youtube.com/watch?v=..." /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description"></textarea></div>
        <div class="pp-form-group"><label>Sort Order</label><input class="pp-input" type="number" name="sort_order" value="1" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" checked /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Add Video</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = {}
      fd.forEach((v, k) => { row[k] = v })
      row.is_active = row.is_active === 'on'
      row.sort_order = parseInt(row.sort_order) || 1
      row.youtube_id = extractYoutubeId(row.youtube_url)
      try {
        await db.adminInsert('videos', row)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Video added!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppEditVideo = async (id) => {
    const videos = await db.getAllVideos()
    const v = videos.find(x => x.id === id)
    if (!v) return
    showModal('Edit Video', `
      <form id="pp-modal-form">
        <div class="pp-form-group"><label>Title</label><input class="pp-input" type="text" name="title" value="${v.title}" required /></div>
        <div class="pp-form-group"><label>YouTube URL</label><input class="pp-input" type="text" name="youtube_url" value="${v.youtube_url || ''}" /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description">${v.description || ''}</textarea></div>
        <div class="pp-form-group"><label>Sort Order</label><input class="pp-input" type="number" name="sort_order" value="${v.sort_order || 1}" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" ${v.is_active ? 'checked' : ''} /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Save</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const updates = {}
      fd.forEach((v, k) => { updates[k] = v })
      updates.is_active = updates.is_active === 'on'
      updates.sort_order = parseInt(updates.sort_order) || 1
      updates.youtube_id = extractYoutubeId(updates.youtube_url)
      try {
        await db.adminUpdate('videos', id, updates)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Video updated!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppDeleteVideo = async (id) => {
    if (!confirm('Delete this video?')) return
    try { await db.adminDelete('videos', id); showToast('Video deleted!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  // ============================================================
  // SECRET CODE CRUD
  // ============================================================
  window.__ppAddCode = async () => {
    const chapters = await db.getAllChapters()
    showModal('Add Secret Code', `
      <form id="pp-modal-form">
        <div class="pp-form-group">
          <label>Chapter</label>
          <select class="pp-select" name="chapter_id" required>
            ${chapters.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
          </select>
        </div>
        <div class="pp-form-group"><label>Code</label><input class="pp-input" type="text" name="code" required placeholder="THERMO27" style="text-transform:uppercase" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" checked /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Create Code</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = {}
      fd.forEach((v, k) => { row[k] = v })
      row.is_active = row.is_active === 'on'
      row.code = row.code.toUpperCase()
      try {
        await db.adminInsert('secret_codes', row)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Secret code created!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppToggleCode = async (id, newVal) => {
    try { await db.adminUpdate('secret_codes', id, { is_active: newVal }); showToast('Code updated!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  window.__ppDeleteCode = async (id) => {
    if (!confirm('Delete this secret code?')) return
    try { await db.adminDelete('secret_codes', id); showToast('Code deleted!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  // ============================================================
  // QUIZ CRUD
  // ============================================================
  window.__ppAddQuiz = async () => {
    const chapters = await db.getAllChapters()
    const settings = await db.getPlatformSettings()
    showModal('Add Quiz', `
      <form id="pp-modal-form">
        <div class="pp-form-group">
          <label>Chapter</label>
          <select class="pp-select" name="chapter_id" required>
            ${chapters.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
          </select>
        </div>
        <div class="pp-form-group"><label>Title</label><input class="pp-input" type="text" name="title" required placeholder="Quiz title" /></div>
        <div class="pp-grid-2">
          <div class="pp-form-group"><label>Passing %</label><input class="pp-input" type="number" name="passing_percentage" value="${settings.default_passing_percentage || 80}" min="0" max="100" required /></div>
          <div class="pp-form-group"><label>Max Questions</label><input class="pp-input" type="number" name="max_questions" value="${settings.default_max_questions || 10}" min="1" required /></div>
        </div>
        <div class="pp-form-group"><label>Max Attempts (blank = unlimited)</label><input class="pp-input" type="number" name="max_attempts" value="" min="1" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" checked /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Create Quiz</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = {}
      fd.forEach((v, k) => { row[k] = v })
      row.is_active = row.is_active === 'on'
      row.passing_percentage = parseInt(row.passing_percentage)
      row.max_questions = parseInt(row.max_questions)
      row.max_attempts = row.max_attempts ? parseInt(row.max_attempts) : null
      try {
        await db.adminInsert('quizzes', row)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Quiz created!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppEditQuiz = async (id) => {
    const quizzes = await db.getAllQuizzes()
    const q = quizzes.find(x => x.id === id)
    if (!q) return
    showModal('Edit Quiz', `
      <form id="pp-modal-form">
        <div class="pp-form-group"><label>Title</label><input class="pp-input" type="text" name="title" value="${q.title}" required /></div>
        <div class="pp-grid-2">
          <div class="pp-form-group"><label>Passing %</label><input class="pp-input" type="number" name="passing_percentage" value="${q.passing_percentage}" min="0" max="100" required /></div>
          <div class="pp-form-group"><label>Max Questions</label><input class="pp-input" type="number" name="max_questions" value="${q.max_questions}" min="1" required /></div>
        </div>
        <div class="pp-form-group"><label>Max Attempts (blank = unlimited)</label><input class="pp-input" type="number" name="max_attempts" value="${q.max_attempts || ''}" min="1" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" ${q.is_active ? 'checked' : ''} /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Save</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const updates = {}
      fd.forEach((v, k) => { updates[k] = v })
      updates.is_active = updates.is_active === 'on'
      updates.passing_percentage = parseInt(updates.passing_percentage)
      updates.max_questions = parseInt(updates.max_questions)
      updates.max_attempts = updates.max_attempts ? parseInt(updates.max_attempts) : null
      try {
        await db.adminUpdate('quizzes', id, updates)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Quiz updated!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppDeleteQuiz = async (id) => {
    if (!confirm('Delete this quiz and all its questions?')) return
    try { await db.adminDelete('quizzes', id); showToast('Quiz deleted!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  // ============================================================
  // QUESTION CRUD
  // ============================================================
  window.__ppManageQuestions = async (quizId) => {
    const [questions, quizzes] = await Promise.all([db.getAllQuestions(quizId), db.getAllQuizzes()])
    const qz = quizzes.find(x => x.id === quizId)
    showModal(`Questions: ${qz?.title || ''}`, `
      <div style="display:flex;gap:0.5rem;margin-bottom:1rem">
        <button class="pp-btn pp-btn-primary" style="flex:1" onclick="window.__ppAddQuestion('${quizId}')">+ Add Single Question</button>
        <button class="pp-btn pp-btn-secondary" style="flex:1" onclick="window.__ppBulkImport('${quizId}')">📋 Bulk Import (Paste)</button>
      </div>
      <div id="pp-questions-list">
        ${questions.map((q, i) => `
          <div class="pp-card pp-mb-2" style="padding:1rem">
            <div class="pp-flex pp-justify-between">
              <strong>${i + 1}. ${q.question_text}</strong>
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteQuestion('${q.id}', '${quizId}')">Delete</button>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">
              A: ${q.option_a} | B: ${q.option_b} | C: ${q.option_c} | D: ${q.option_d}<br>
              <span style="color:var(--success-600)">Correct: ${q.correct_answer.toUpperCase()}</span>
              ${q.explanation ? `<br>💡 ${q.explanation}` : ''}
            </div>
          </div>
        `).join('') || '<div class="pp-admin-empty">No questions yet</div>'}
      </div>
    `)
  }

  window.__ppAddQuestion = async (quizId) => {
    document.getElementById('pp-modal-overlay')?.remove()
    showModal('Add Question', `
      <form id="pp-modal-form">
        <input type="hidden" name="quiz_id" value="${quizId}" />
        <div class="pp-form-group"><label>Question</label><textarea class="pp-textarea" name="question_text" required placeholder="Enter the question..."></textarea></div>
        <div class="pp-grid-2">
          <div class="pp-form-group"><label>Option A</label><input class="pp-input" type="text" name="option_a" required /></div>
          <div class="pp-form-group"><label>Option B</label><input class="pp-input" type="text" name="option_b" required /></div>
          <div class="pp-form-group"><label>Option C</label><input class="pp-input" type="text" name="option_c" required /></div>
          <div class="pp-form-group"><label>Option D</label><input class="pp-input" type="text" name="option_d" required /></div>
        </div>
        <div class="pp-form-group">
          <label>Correct Answer</label>
          <select class="pp-select" name="correct_answer" required>
            <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
          </select>
        </div>
        <div class="pp-form-group"><label>Explanation</label><textarea class="pp-textarea" name="explanation" placeholder="Why is this correct?"></textarea></div>
        <div class="pp-form-group"><label>Sort Order</label><input class="pp-input" type="number" name="sort_order" value="1" /></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Add Question</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = { is_active: true }
      fd.forEach((v, k) => { row[k] = v })
      row.sort_order = parseInt(row.sort_order) || 1
      try {
        await db.adminInsert('questions', row)
        document.getElementById('pp-modal-overlay')?.remove()
        showToast('Question added!', 'success')
        window.__ppManageQuestions(quizId)
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  // ------------------------------------------------------------
  // 📋 BULK IMPORT
  // ------------------------------------------------------------
  window.__ppBulkImport = (quizId) => {
    document.getElementById('pp-modal-overlay')?.remove()
    showModal('Bulk Import Questions', `
      <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem">
        Paste all your questions below. The parser will automatically detect questions, options, and answers.
      </div>
      <div class="pp-alert info" style="font-size:0.8rem;margin-bottom:1rem">
        <strong>Format example:</strong><br>
        <pre style="margin:0.5rem 0;white-space:pre-wrap;font-size:0.75rem">Q: What is the SI unit of force?
A) Joule
B) Newton
C) Watt
D) Pascal
Answer: B</pre>
        Also works with <code>1.</code>, <code>Q1:</code>, <code>A.</code>, <code>Ans:</code>, etc.
      </div>
      <form id="pp-bulk-form">
        <div class="pp-form-group">
          <label>Paste questions here</label>
          <textarea class="pp-textarea" name="bulk_text" id="pp-bulk-text" required
            style="min-height:280px;font-family:monospace;font-size:0.85rem"
            placeholder="Paste your questions here..."></textarea>
        </div>
        <div id="pp-bulk-preview" style="margin:0.5rem 0"></div>
        <div class="pp-modal-footer" style="display:flex;gap:0.5rem;justify-content:space-between">
          <button type="button" class="pp-btn pp-btn-secondary" onclick="window.__ppPreviewBulk()">🔍 Preview</button>
          <button type="submit" class="pp-btn pp-btn-primary">✅ Import All</button>
        </div>
      </form>
    `)

    document.getElementById('pp-bulk-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const text = document.getElementById('pp-bulk-text').value
      const { questions, errors } = parseBulkQuestions(text)

      if (questions.length === 0) {
        document.getElementById('pp-bulk-preview').innerHTML = `
          <div class="pp-alert error" style="font-size:0.85rem">
            ❌ No valid questions found.<br>
            ${errors.length ? errors.join('<br>') : 'Check the format and try again.'}
          </div>
        `
        return
      }

      const previewEl = document.getElementById('pp-bulk-preview')
      previewEl.innerHTML = `<div class="pp-alert info" style="font-size:0.85rem">⏳ Importing ${questions.length} questions...</div>`

      let success = 0
      let failed = 0
      const failedMsgs = []

      for (const q of questions) {
        try {
          await db.adminInsert('questions', { ...q, quiz_id: quizId })
          success++
        } catch (err) {
          failed++
          failedMsgs.push(`${q.question_text.slice(0, 40)}... → ${err.message}`)
        }
      }

      previewEl.innerHTML = `
        <div class="pp-alert ${failed === 0 ? 'success' : 'info'}" style="font-size:0.85rem">
          ✅ Imported ${success} / ${questions.length} questions.${failed ? `<br>❌ Failed: ${failed}<br>${failedMsgs.join('<br>')}` : ''}
        </div>
      `

      if (success > 0) {
        setTimeout(() => {
          document.getElementById('pp-modal-overlay')?.remove()
          showToast(`✅ Imported ${success} questions!`, 'success')
          window.__ppManageQuestions(quizId)
        }, 1200)
      }
    })
  }

  window.__ppPreviewBulk = () => {
    const text = document.getElementById('pp-bulk-text').value
    const { questions, errors } = parseBulkQuestions(text)
    const previewEl = document.getElementById('pp-bulk-preview')

    if (questions.length === 0) {
      previewEl.innerHTML = `
        <div class="pp-alert error" style="font-size:0.85rem">
          ❌ No valid questions found.<br>
          ${errors.length ? errors.join('<br>') : 'Check the format and try again.'}
        </div>
      `
      return
    }

    previewEl.innerHTML = `
      <div class="pp-alert success" style="font-size:0.85rem">
        ✅ Found <strong>${questions.length}</strong> valid questions.
        ${errors.length ? `<br>⚠️ ${errors.length} skipped: ${errors.slice(0, 3).join(' | ')}${errors.length > 3 ? '...' : ''}` : ''}
      </div>
      <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:0.5rem;background:#f9fafb">
        ${questions.map((q, i) => `
          <div style="padding:0.5rem 0;border-bottom:1px solid #e5e7eb;font-size:0.8rem">
            <strong>${i + 1}. ${q.question_text}</strong><br>
            A: ${q.option_a}<br>
            B: ${q.option_b}<br>
            C: ${q.option_c}<br>
            D: ${q.option_d}<br>
            <span style="color:#16a34a">✔ Correct: ${q.correct_answer.toUpperCase()}</span>
          </div>
        `).join('')}
      </div>
    `
  }

  window.__ppDeleteQuestion = async (id, quizId) => {
    if (!confirm('Delete this question?')) return
    try {
      await db.adminDelete('questions', id)
      showToast('Question deleted!', 'success')
      if (quizId) {
        document.getElementById('pp-modal-overlay')?.remove()
        window.__ppManageQuestions(quizId)
      }
    } catch (err) { showToast('Error: ' + err.message, 'error') }
  }

  // ============================================================
  // BADGE CRUD
  // ============================================================
  window.__ppAddBadge = async () => {
    const chapters = await db.getAllChapters()
    showModal('Add Badge', `
      <form id="pp-modal-form">
        <div class="pp-form-group">
          <label>Chapter</label>
          <select class="pp-select" name="chapter_id" required>
            ${chapters.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
          </select>
        </div>
        <div class="pp-form-group"><label>Badge Name</label><input class="pp-input" type="text" name="name" required placeholder="Heat Explorer" /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description"></textarea></div>
        <div class="pp-form-group"><label>Icon</label><input class="pp-input" type="text" name="icon_name" value="award" placeholder="award" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" checked /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Create Badge</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const row = {}
      fd.forEach((v, k) => { row[k] = v })
      row.is_active = row.is_active === 'on'
      try {
        await db.adminInsert('badges', row)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Badge created!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppEditBadge = async (id) => {
    const badges = await db.getAllBadges()
    const b = badges.find(x => x.id === id)
    if (!b) return
    showModal('Edit Badge', `
      <form id="pp-modal-form">
        <div class="pp-form-group"><label>Name</label><input class="pp-input" type="text" name="name" value="${b.name}" required /></div>
        <div class="pp-form-group"><label>Description</label><textarea class="pp-textarea" name="description">${b.description || ''}</textarea></div>
        <div class="pp-form-group"><label>Icon</label><input class="pp-input" type="text" name="icon_name" value="${b.icon_name || 'award'}" /></div>
        <div class="pp-form-group"><label><input type="checkbox" name="is_active" ${b.is_active ? 'checked' : ''} /> Active</label></div>
        <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">Save</button></div>
      </form>
    `)
    document.getElementById('pp-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target)
      const updates = {}
      fd.forEach((v, k) => { updates[k] = v })
      updates.is_active = updates.is_active === 'on'
      try {
        await db.adminUpdate('badges', id, updates)
        document.getElementById('pp-modal-overlay').remove()
        showToast('Badge updated!', 'success')
        loadAdminContent()
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppDeleteBadge = async (id) => {
    if (!confirm('Delete this badge?')) return
    try { await db.adminDelete('badges', id); showToast('Badge deleted!', 'success'); loadAdminContent() }
    catch (err) { showToast('Error: ' + err.message, 'error') }
  }
}
// ============================================================
// ADMIN GAMES
// ============================================================
async function renderAdminGames() {
  let games = []
  let fetchError = null

  try {
    games = await db.getAllGames()
    if (!Array.isArray(games)) games = []
  } catch (err) {
    console.error('Games fetch error:', err)
    fetchError = err.message || String(err)
  }

  if (fetchError) {
    return `
      <h1 class="pp-admin-page-title">Games</h1>
      <div class="pp-card" style="text-align:center;padding:2rem">
        <div style="font-size:3rem;margin-bottom:0.5rem">⚠️</div>
        <h3 style="margin:0 0 0.5rem">Could not load games</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;margin:0.5rem 0">${fetchError}</p>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:1rem">
          Make sure the <code>games</code> table exists.
        </p>
      </div>
    `
  }

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Games</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddGame()">+ Upload Game</button>
    </div>

    <div class="pp-alert info" style="font-size:0.85rem;margin-bottom:1rem">
      🎮 Upload any HTML game file. Students will see a "Play Games" button on their dashboard automatically.
    </div>

    ${games.length === 0
      ? `<div class="pp-card" style="text-align:center;padding:3rem">
          <div style="font-size:3rem;margin-bottom:0.5rem">🎮</div>
          <h3 style="margin:0 0 0.5rem">No games yet</h3>
          <p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 1rem">
            Upload your first HTML game — it will appear on every student's dashboard.
          </p>
          <button class="pp-btn pp-btn-primary" onclick="window.__ppAddGame()">🎮 Upload Your First Game</button>
        </div>`
      : `<div class="pp-chapters-grid">
          ${games.map(g => `
            <div class="pp-card pp-text-center">
              <div style="font-size:3rem;margin-bottom:0.5rem">${g.icon || '🎮'}</div>
              <strong>${g.title}</strong>
              <div style="font-size:0.85rem;color:var(--text-muted);margin:0.3rem 0">
                ${g.description || ''}
              </div>
              <div style="margin:0.5rem 0">
                <span class="pp-badge-chip ${g.is_active ? 'active' : 'inactive'}">
                  ${g.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div class="pp-mt-1 pp-flex pp-gap-1" style="justify-content:center;flex-wrap:wrap">
                <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppPreviewGame('${g.id}')">👁 Preview</button>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditGame('${g.id}')">Edit</button>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppToggleGame('${g.id}', ${!g.is_active})">${g.is_active ? 'Disable' : 'Enable'}</button>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteGame('${g.id}')">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>`
    }
  `
}

function attachGameHandlers() {
  window.__ppAddGame = () => openGameForm()

  window.__ppEditGame = async (id) => {
    const game = await db.getGameById(id)
    if (!game) {
      showToast('Could not load game.', 'error')
      return
    }
    openGameForm(game)
  }

  window.__ppToggleGame = async (id, isActive) => {
    try {
      await db.adminUpdate('games', id, { is_active: isActive })
      showToast(`Game ${isActive ? 'enabled' : 'disabled'}!`, 'success')
      loadAdminContent()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  window.__ppDeleteGame = async (id) => {
    if (!confirm('Delete this game? Students will no longer be able to play it.')) return
    try {
      await db.adminDelete('games', id)
      showToast('Game deleted!', 'success')
      loadAdminContent()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  window.__ppPreviewGame = async (id) => {
    const game = await db.getGameById(id)
    if (!game) {
      showToast('Could not load game.', 'error')
      return
    }
    showModal(`Preview: ${game.title}`, '<iframe id="pp-game-preview" title="Game preview" style="width:100%;height:65vh;border:0;background:#fff"></iframe>')
    const frame = document.getElementById('pp-game-preview')
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals')
    frame.srcdoc = game.html_content || ''
  }
}

async function refreshAndVerifyAdminSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session) {
    await supabase.auth.signOut({ scope: 'local' })
    state.adminAuth = false
    state.adminSecretKey = null
    render()
    throw new Error('Your admin session has expired. Sign in to the admin panel again.')
  }

  let user = null
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (!userError && userData.user) {
    user = userData.user
  } else {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !refreshData.session) {
      await supabase.auth.signOut({ scope: 'local' })
      state.adminAuth = false
      const reason = refreshError?.message || userError?.message || 'No active session'
      throw new Error(`Admin session could not be refreshed (${reason}). Sign in to the admin panel again.`)
    }
    user = refreshData.session.user
  }

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw new Error('Could not verify admin access: ' + profileError.message)
  if (!profile) {
    await supabase.auth.signOut({ scope: 'local' })
    state.adminAuth = false
    throw new Error('This account has no admin profile. Sign in with an admin account.')
  }
}

function openGameForm(game = null) {
  const editing = Boolean(game)
  showModal(editing ? 'Edit Game' : 'Upload Game', `
    <form id="pp-game-form">
      <div class="pp-form-group">
        <label class="pp-label">Game Title</label>
        <input class="pp-input" type="text" name="title" maxlength="100" placeholder="Uses the HTML title or filename if blank" value="${game?.title || ''}" />
      </div>
      <div class="pp-form-group">
        <label class="pp-label">Description</label>
        <textarea class="pp-textarea" name="description" maxlength="500" placeholder="A short description for students">${game?.description || ''}</textarea>
      </div>
      <div class="pp-form-group">
        <label class="pp-label">Icon (emoji)</label>
        <input class="pp-input" type="text" name="icon" maxlength="8" value="${game?.icon || '🎮'}" />
      </div>
      <div class="pp-form-group">
        <label class="pp-label">${editing ? 'Replace HTML Game File (optional)' : 'HTML Game File'}</label>
        <input class="pp-input" type="file" name="html_file" accept=".html,text/html" ${editing ? '' : 'required'} />
        ${editing ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">Leave empty to keep the current game file.</div>' : ''}
      </div>
      <div class="pp-form-group">
        <label class="pp-label">Display order</label>
        <input class="pp-input" type="number" name="sort_order" min="0" value="${game?.sort_order ?? 0}" />
      </div>
      <div class="pp-form-group">
        <label><input type="checkbox" name="is_active" ${game?.is_active === false ? '' : 'checked'} /> Show to students</label>
      </div>
      <div id="pp-game-form-error" class="pp-error-text pp-hidden"></div>
      <div class="pp-modal-footer"><button type="submit" class="pp-btn pp-btn-primary">${editing ? 'Save Game' : 'Upload Game'}</button></div>
    </form>
  `)

  const form = document.getElementById('pp-game-form')
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const submitButton = form.querySelector('button[type="submit"]')
    const errorElement = document.getElementById('pp-game-form-error')
    const file = form.elements.html_file.files[0]
    submitButton.disabled = true
    errorElement.classList.add('pp-hidden')

    try {
      await refreshAndVerifyAdminSession()

      let htmlContent = game?.html_content || ''
      if (file) {
        if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
          throw new Error('Choose an .html file.')
        }
        if (file.size > 2 * 1024 * 1024) {
          throw new Error('HTML game files must be 2 MB or smaller.')
        }
        htmlContent = await file.text()
        if (!htmlContent.trim()) throw new Error('The selected HTML file is empty.')
      }

      const formData = new FormData(form)
      const documentTitle = file
        ? new DOMParser().parseFromString(htmlContent, 'text/html').title.trim()
        : ''
      const fileTitle = file ? file.name.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').trim() : ''
      const title = formData.get('title').trim() || game?.title || documentTitle || fileTitle
      if (!title) throw new Error('Add a title or upload a file with a filename.')
      const payload = {
        title: title.slice(0, 100),
        description: formData.get('description').trim(),
        icon: formData.get('icon').trim() || '🎮',
        sort_order: Number(formData.get('sort_order')) || 0,
        is_active: formData.has('is_active'),
        html_content: htmlContent,
      }

      if (editing) await db.adminUpdate('games', game.id, payload)
      else await db.adminInsert('games', payload)

      document.getElementById('pp-modal-overlay').remove()
      showToast(editing ? 'Game updated!' : 'Game uploaded!', 'success')
      loadAdminContent()
    } catch (err) {
      const message = err.message || 'Could not save game.'
      errorElement.textContent = /row-level security/i.test(message)
        ? 'Supabase blocked this write. Apply the latest Games RLS migration, then sign in again.'
        : message
      errorElement.classList.remove('pp-hidden')
      submitButton.disabled = false
    }
  })
}
