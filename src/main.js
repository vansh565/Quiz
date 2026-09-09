/* ============================================================
   Professor Photon — Main App Entry
   ============================================================ */

import './styles.css'
import { supabase } from './supabase.js'
import { state, navigate, setStudent, getStudentId, clearStudentId, setRender, getRoute, autoLogin } from './state.js'
import {
  renderLanding, 
  attachOnboarding, 
  renderDashboard, 
  renderChapter, 
  attachCodeEntry,
  renderCodeEntry, 
  renderQuiz, 
  attachQuiz, 
  renderResult, 
  renderBadge,
  renderCertificate, 
  renderVerify, 
  attachVerify, 
  studentLogout,
  renderAchievements
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

async function renderStudentRoute() {
  if (!state.student) {
    const savedId = getStudentId()
    if (savedId) {
      try {
        const student = await getStudentById(savedId)
        if (student) {
          setStudent(student)
          if (state.view === 'landing') {
            state.view = 'dashboard'
          }
        } else {
          clearStudentId()
        }
      } catch (error) {
        console.error('Auto-login error:', error)
      }
    }
  }

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
      if (state.student) {
        state.view = 'dashboard'
        return await renderDashboard()
      }
      const landingHtml = renderLanding()
      setTimeout(() => attachOnboarding(), 0)
      return landingHtml
    case 'dashboard':
      return await renderDashboard()
    case 'achievements':
      return await renderAchievements()
    case 'chapter':
      return await renderChapter()
    case 'code':
      return renderCodeEntry()
    case 'quiz':
      return await renderQuiz()
    case 'result':
      return await renderResult()
    case 'badge':
      return renderBadge()
    case 'certificate':
      return renderCertificate()
    default:
      state.view = 'landing'
      return renderLanding()
  }
}

async function renderAdminRoute() {
  if (!state.adminAuth) {
    setTimeout(() => attachAdminLogin(), 0)
    return renderAdminLogin()
  }
  setTimeout(() => attachAdminPanel(), 0)
  return renderAdminPanel()
}

function attachStudentHandlers() {
  if (state.view === 'landing') {
    attachOnboarding()
  } else if (state.view === 'code') {
    attachCodeEntry()
  } else if (state.view === 'quiz') {
    attachQuiz()
  }
}

setRender(async () => {
  await render()
})
// src/main.js - Update renderHeader function
// src/main.js - Update renderHeader function

function renderHeader() {
  const route = getRoute()
  const isAdmin = route.path === 'admin'
  const isVerify = route.path === 'verify'

  let navHTML = ''
  if (isAdmin && state.adminAuth) {
    navHTML = `<button class="pp-nav-btn" onclick="window.__ppAdminLogout()">Sign Out</button>`
  } else if (state.student && !isAdmin && !isVerify) {
    navHTML = `
      <button class="pp-nav-btn" onclick="window.__ppNav('dashboard')">Dashboard</button>
      <button class="pp-nav-btn" onclick="window.__ppNav('achievements')">🏆 Achievements</button>
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
  state.view = 'landing'
  render()
}

window.__ppStudentLogout = () => studentLogout()
window.__ppAdminLogout = () => adminLogout()

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

async function init() {
  console.log('🚀 Initializing app...')
  
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

  const loggedIn = await autoLogin(getStudentById)
  if (loggedIn) {
    console.log('✅ Student auto-logged in')
  } else {
    console.log('ℹ️ No saved student session found')
  }

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
