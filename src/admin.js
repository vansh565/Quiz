/* ============================================================
   Professor Photon — Admin Panel with Master Secret Key
   ============================================================ */

import { supabase } from './supabase.js'
import { state, render } from './state.js'
import * as db from './data.js'

// ============================================================
// MASTER SECRET KEY - Only this key can create admin accounts
// ============================================================
const MASTER_SECRET_KEY = '#Vsharma@105'

let adminEmail = ''
let adminPassword = ''

// ============================================================
// ADMIN LOGIN WITH MASTER SECRET KEY
// ============================================================
export function renderAdminLogin() {
  return `
    <div class="pp-landing">
      <div class="pp-landing-content" style="max-width:420px">
        <div class="pp-landing-logo" style="width:80px;height:80px;font-size:2.5rem">🔐</div>
        <h1 style="font-size:1.8rem">Admin Panel</h1>
        <p class="pp-landing-tagline">Professor Photon Administration</p>
        <div class="pp-card pp-onboarding-card">
          <h2>Secure Access</h2>
          <p style="text-align:center;color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem">
            Enter your admin credentials and the secret key to access the panel.
          </p>
          <form id="pp-admin-login-form">
            <div class="pp-form-group">
              <label class="pp-label">Email</label>
              <input class="pp-input" type="email" name="email" required placeholder="admin@example.com" />
            </div>
            <div class="pp-form-group">
              <label class="pp-label">Password</label>
              <input class="pp-input" type="password" name="password" required placeholder="Password" />
            </div>
            <div class="pp-form-group">
              <label class="pp-label">🔑 Secret Key</label>
              <input class="pp-input" type="password" name="secret_key" required placeholder="Enter your secret key" />
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
                <input class="pp-input" type="email" name="email" required placeholder="admin@example.com" />
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
          await supabase.auth.signOut()
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

      // Validate master secret key
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
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('students')
          .select('email')
          .eq('email', email)
          .maybeSingle()

        if (existingUser) {
          errEl.textContent = '❌ This email is already registered as a student. Please use a different email.'
          errEl.classList.remove('pp-hidden')
          return
        }

        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user) {
          try {
            await supabase
              .from('auth.users')
              .update({ email_confirmed_at: new Date().toISOString() })
              .eq('id', data.user.id)
          } catch {}

          const { error: profErr } = await supabase
            .from('admin_profiles')
            .insert({ 
              id: data.user.id, 
              full_name: fullName, 
              email: email,
              secret_key: secretKey
            })

          if (profErr) {
            await supabase.auth.admin.deleteUser(data.user.id)
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
  await supabase.auth.signOut()
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
  { id: 'attempts', label: 'Quiz Attempts', icon: '📋' },
  { id: 'certificates', label: 'Certificates', icon: '📜' },
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
  loadAdminContent()
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
      case 'attempts': html = await renderAdminAttempts(); break
      case 'certificates': html = await renderAdminCertificates(); break
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
  const [students, courses, chapters, quizzes, questions, certs, attempts, emails] = await Promise.all([
    db.getAllStudents(),
    db.getAllCourses(),
    db.getAllChapters(),
    db.getAllQuizzes(),
    db.getAllQuestions(),
    db.getAllCertificates(),
    db.getAllAttempts(),
    db.getAllEmailLogs(),
  ])

  return `
    <h1 class="pp-admin-page-title">Dashboard</h1>
    <div class="pp-stats-grid">
      <div class="pp-stat-card"><div class="val">${students.length}</div><div class="label">Students</div></div>
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
      <h3>Recent Students</h3>
      <table class="pp-admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Class</th><th>Joined</th></tr></thead>
        <tbody>
          ${students.slice(0, 5).map(s => `
            <tr><td>${s.name}</td><td>${s.email}</td><td>${s.class_level}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>
          `).join('') || '<tr><td colspan="4" class="pp-admin-empty">No students yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN STUDENTS
// ============================================================
let studentSearch = ''
async function renderAdminStudents() {
  const students = await db.getAllStudents(studentSearch)
  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Students</h1>
      <input class="pp-search-input" type="text" placeholder="Search by name, email, phone..." value="${studentSearch}" id="pp-student-search" />
    </div>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Class</th><th>Joined</th></tr></thead>
        <tbody>
          ${students.map(s => `<tr><td>${s.name}</td><td>${s.email}</td><td>${s.phone || '—'}</td><td>${s.class_level}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('') || '<tr><td colspan="5" class="pp-admin-empty">No students found</td></tr>'}
        </tbody>
      </table>
    </div>
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
              <td>${chapters.find(c => c.id === v.chapter_id)?.title || '—'}</td>
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
// ADMIN SECRET CODES
// ============================================================
async function renderAdminCodes() {
  const codes = await db.getAllSecretCodes()

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Secret Codes</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddCode()">+ Add Secret Code</button>
    </div>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Code</th><th>Chapter</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${codes.map(c => `
            <tr>
              <td style="font-family:monospace;font-weight:700">${c.code}</td>
              <td>${c.chapters?.title || '—'}</td>
              <td><span class="pp-badge-chip ${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppToggleCode('${c.id}', ${!c.is_active})">${c.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteCode('${c.id}')">Delete</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="pp-admin-empty">No secret codes yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// ADMIN QUIZZES & QUESTIONS
// ============================================================
async function renderAdminQuizzes() {
  const [quizzes, questions, chapters] = await Promise.all([
    db.getAllQuizzes(),
    db.getAllQuestions(),
    db.getAllChapters(),
  ])

  const quizzesHTML = quizzes.map(q => {
    const chapter = chapters.find(c => c.id === q.chapter_id)
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

  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Quizzes & Questions</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddQuiz()">+ Add Quiz</button>
    </div>
    ${quizzesHTML || '<div class="pp-admin-empty">No quizzes yet</div>'}
  `
}

// ============================================================
// ADMIN BADGES
// ============================================================
async function renderAdminBadges() {
  const badges = await db.getAllBadges()
  return `
    <div class="pp-admin-toolbar">
      <h1 class="pp-admin-page-title" style="margin:0">Badges</h1>
      <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppAddBadge()">+ Add Badge</button>
    </div>
    <div class="pp-chapters-grid">
      ${badges.map(b => `
        <div class="pp-card pp-text-center">
          <div style="font-size:3rem;margin-bottom:0.5rem">🏆</div>
          <strong>${b.name}</strong>
          <div style="font-size:0.85rem;color:var(--text-muted);margin:0.3rem 0">${b.description || ''}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Chapter: ${b.chapters?.title || '—'}</div>
          <div class="pp-mt-1">
            <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppEditBadge('${b.id}')">Edit</button>
            <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteBadge('${b.id}')">Delete</button>
          </div>
        </div>
      `).join('') || '<div class="pp-admin-empty">No badges yet</div>'}
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
              <td>${new Date(a.created_at).toLocaleDateString()}</td>
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
  const logs = await db.getAllEmailLogs()
  return `
    <h1 class="pp-admin-page-title">Email Logs</h1>
    <div class="pp-card">
      <table class="pp-admin-table">
        <thead><tr><th>Type</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td><span class="pp-badge-chip ${l.email_type === 'badge' ? 'active' : 'inactive'}">${l.email_type}</span></td>
              <td>${l.recipient_email}</td>
              <td>${l.subject || '—'}</td>
              <td><span class="pp-badge-chip ${l.status === 'sent' ? 'active' : 'inactive'}">${l.status}</span></td>
              <td>${new Date(l.sent_at).toLocaleDateString()}</td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="pp-admin-empty">No emails sent yet</td></tr>'}
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
          <input class="pp-input" type="text" name="platform_name" value="${settings.platform_name || 'Professor Photon'}" />
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

// ============================================================
// ADMIN CONTENT HANDLERS
// ============================================================
function attachAdminContentHandlers() {
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
      const match = row.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
      row.youtube_id = match ? match[1] : ''
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
      const match = updates.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
      updates.youtube_id = match ? match[1] : ''
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
      <div id="pp-questions-list">
        ${questions.map((q, i) => `
          <div class="pp-card pp-mb-2" style="padding:1rem">
            <div class="pp-flex pp-justify-between">
              <strong>${i + 1}. ${q.question_text}</strong>
              <button class="pp-btn pp-btn-ghost pp-btn-sm" onclick="window.__ppDeleteQuestion('${q.id}')">Delete</button>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">
              A: ${q.option_a} | B: ${q.option_b} | C: ${q.option_c} | D: ${q.option_d}<br>
              <span style="color:var(--success-600)">Correct: ${q.correct_answer.toUpperCase()}</span>
              ${q.explanation ? `<br>💡 ${q.explanation}` : ''}
            </div>
          </div>
        `).join('') || '<div class="pp-admin-empty">No questions yet</div>'}
      </div>
      <button class="pp-btn pp-btn-primary pp-btn-block" onclick="window.__ppAddQuestion('${quizId}')">+ Add Question</button>
    `)
  }

  window.__ppAddQuestion = async (quizId) => {
    document.getElementById('pp-modal-overlay').remove()
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
        document.getElementById('pp-modal-overlay').remove()
        showToast('Question added!', 'success')
        window.__ppManageQuestions(quizId)
      } catch (err) { showToast('Error: ' + err.message, 'error') }
    })
  }

  window.__ppDeleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return
    try {
      await db.adminDelete('questions', id)
      document.getElementById('pp-modal-overlay').remove()
      showToast('Question deleted!', 'success')
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
