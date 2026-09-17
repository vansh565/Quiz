/* ============================================================
   Professor Prabh — Main App Entry (No Dashboard / No History)
   ============================================================ */

import './styles.css'
import { supabase } from './supabase.js'
import {
  state, navigate, setStudent, getStudentId, clearStudentId,
  setRender, getRoute, autoLogin
} from './state.js'
import {
  renderLanding,
  attachOnboarding,
  renderChapters,
  renderCodeEntry,
  attachCodeEntry,
  renderQuiz,
  attachQuiz,
  renderResult,
  renderBadge,
  renderCertificate,
  renderVerify,
  attachVerify,
  studentLogout,
  // 🎓 NEW — Final combined quiz
  renderFinalQuiz,
  attachFinalQuiz,
  renderFinalResult,
} from './student.js'
import {
  renderAdminLogin,
  attachAdminLogin,
  renderAdminPanel,
  attachAdminPanel,
  adminLogout,
} from './admin.js'
import { getStudentById } from './data.js'

// Expose navigation globally
window.__ppNav = (view, data = {}) => navigate(view, data)

// ============================================================
// RENDER
// ============================================================
async function render() {
  const app = document.querySelector('#app')
  if (!app) return

  const route = getRoute()
  let html = ''

  if (route.path === 'admin') {
    html = await renderAdminRoute()
  } else if (route.path === 'verify') {
    html = renderVerify()
  } else {
    html = await renderStudentRoute()
  }

  app.innerHTML = html

  if (route.path === 'admin') {
    if (!state.adminAuth) {
      attachAdminLogin()
    } else {
      attachAdminPanel()
    }
  } else if (route.path === 'verify') {
    attachVerify()
  } else {
    attachStudentHandlers()
  }
}

// ============================================================
// STUDENT ROUTES
// ============================================================
async function renderStudentRoute() {
  // No auto-login from localStorage for students — session is in-memory only

  if (state.view === 'certificate' && !state.certificate) {
    const route = getRoute()
    if (route.params && route.params.certificate) {
      try {
        state.certificate = JSON.parse(decodeURIComponent(route.params.certificate))
        window.__certificateData = state.certificate
      } catch (e) {
        console.error('Error parsing certificate data:', e)
      }
    }
  }

  switch (state.view) {
    case 'landing':
      setTimeout(() => attachOnboarding(), 0)
      return renderLanding()

    case 'chapters':
      return await renderChapters()

    case 'code':
      return await renderCodeEntry()

    case 'quiz':
      return await renderQuiz()

    case 'result':
      return await renderResult()

    case 'badge':
      return renderBadge()

    case 'certificate':
      return await renderCertificate()

    // 🎓 NEW — Final combined quiz routes
    case 'final-quiz':
      return await renderFinalQuiz()

    case 'final-result':
      return await renderFinalResult()

    default:
      state.view = 'landing'
      setTimeout(() => attachOnboarding(), 0)
      return renderLanding()
  }
}

// ============================================================
// ADMIN ROUTE
// ============================================================
async function renderAdminRoute() {
  if (!state.adminAuth) {
    setTimeout(() => attachAdminLogin(), 0)
    return renderAdminLogin()
  }
  setTimeout(() => attachAdminPanel(), 0)
  return renderAdminPanel()
}

// ============================================================
// STUDENT HANDLERS (attaches per-view event listeners)
// ============================================================
function attachStudentHandlers() {
  if (state.view === 'landing') {
    attachOnboarding()
  } else if (state.view === 'code') {
    attachCodeEntry()
  } else if (state.view === 'quiz') {
    attachQuiz()
  } else if (state.view === 'final-quiz') {
    attachFinalQuiz()
  }
}

// ============================================================
// HEADER
// ============================================================
function renderHeader() {
  const route = getRoute()
  const isAdmin = route.path === 'admin'
  const isVerify = route.path === 'verify'

  let navHTML = ''
  if (isAdmin && state.adminAuth) {
    navHTML = `<button class="pp-nav-btn" onclick="window.__ppAdminLogout()">Sign Out</button>`
  } else if (state.student && !isAdmin && !isVerify) {
    navHTML = `
      <button class="pp-nav-btn" onclick="window.__ppNav('chapters')">Chapters</button>
      <button class="pp-nav-btn" onclick="window.__ppStudentLogout()">Sign Out</button>
    `
  }

  return `
    <div class="pp-header">
      <div class="pp-header-brand" onclick="window.__ppGoHome()">
        <div class="pp-header-logo">
          <img src="/logo.png" alt="Professor Prabh" class="pp-header-logo-img" />
        </div>
        <div>
          <div class="pp-header-title">Professor Prabh</div>
          <div class="pp-header-subtitle">Learn • Build • Grow</div>
        </div>
      </div>
      <div class="pp-header-nav">
        ${navHTML}
        <button class="pp-nav-btn" onclick="window.location.hash='#verify'">Verify</button>
        <button class="pp-nav-btn" onclick="window.location.hash='#admin'">Admin</button>
      </div>
    </div>
  `
}

window.__ppGoHome = () => {
  window.location.hash = ''
  state.view = state.student ? 'chapters' : 'landing'
  fullRender()
}

window.__ppStudentLogout = () => studentLogout()
window.__ppAdminLogout = () => adminLogout()

// ============================================================
// FULL RENDER (header + body)
// ============================================================
async function fullRender() {
  const headerEl = document.querySelector('#pp-header')
  if (headerEl) {
    headerEl.innerHTML = renderHeader()
  }
  await render()
}

setRender(async () => {
  await fullRender()
})

// ============================================================
// INIT
// ============================================================
async function init() {
  console.log('🚀 Initializing app...')

  // Admin auth check (Supabase session)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
    if (profile) {
      state.adminAuth = true
    }
  }

  // Student auto-login is disabled (no persistence)

  supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      if (event === 'SIGNED_OUT' || !session) {
        state.adminAuth = false
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        state.adminAuth = !!profile
      }
      await fullRender()
    })()
  })

  await fullRender()
}

init()
