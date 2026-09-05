/* ============================================================
   Professor Photon — App State & Router
   ============================================================ */

// src/state.js - Add these to state

export const state = {
  student: null,
  view: 'landing',
  currentChapter: null,
  currentQuiz: null,
  quizResult: null,
  earnedBadge: null,
  certificate: null,
  allBadges: [],
  allComplete: false,
  adminView: 'dashboard',
  adminAuth: false,
}

const STUDENT_KEY = 'pp_student_id'

// ============================================================
// STUDENT SESSION - Using localStorage for persistence
// ============================================================

export function saveStudentId(id) {
  try { 
    localStorage.setItem(STUDENT_KEY, id)  // Changed from sessionStorage
    console.log('✅ Student ID saved to localStorage:', id)
  } catch (e) { 
    console.error('Failed to save student ID:', e)
  }
}

export function getStudentId() {
  try { 
    const id = localStorage.getItem(STUDENT_KEY)  // Changed from sessionStorage
    console.log('🔍 Retrieved student ID from localStorage:', id)
    return id
  } catch { 
    return null 
  }
}

export function clearStudentId() {
  try { 
    localStorage.removeItem(STUDENT_KEY)  // Changed from sessionStorage
    console.log('🗑️ Student ID cleared from localStorage')
  } catch {}
}

export function setStudent(student) {
  state.student = student
  if (student) {
    saveStudentId(student.id)
    console.log('👤 Student set:', student.email || student.name)
  } else {
    clearStudentId()
  }
}

// src/state.js - Update the navigate function

export function navigate(view, data = {}) {
  state.view = view
  
  // Handle different view types
  if (data.chapter) state.currentChapter = data.chapter
  if (data.quiz) state.currentQuiz = data.quiz
  if (data.result) state.quizResult = data.result
  if (data.badge) state.earnedBadge = data.badge
  if (data.certificate) {
    state.certificate = data.certificate
    // Also store in window for renderCertificate to access
    window.__certificateData = data.certificate
  }
  
  window.scrollTo(0, 0)
  render()
}

let renderFn = null
export function setRender(fn) { renderFn = fn }
export function render() {
  if (renderFn) renderFn()
}

export function getRoute() {
  const hash = window.location.hash.slice(1)
  if (!hash) return { path: '', params: {} }
  const [path, queryStr] = hash.split('?')
  const params = {}
  if (queryStr) {
    new URLSearchParams(queryStr).forEach((v, k) => { params[k] = v })
  }
  return { path, params }
}

export function setRoute(path, params = {}) {
  const query = new URLSearchParams(params).toString()
  window.location.hash = query ? `${path}?${query}` : path
}

// ============================================================
// AUTO-LOGIN FUNCTION
// ============================================================

export async function autoLogin(getStudentById) {
  const savedId = getStudentId()
  if (savedId) {
    try {
      const student = await getStudentById(savedId)
      if (student) {
        setStudent(student)
        state.view = 'dashboard'
        console.log('🔄 Auto-login successful:', student.email || student.name)
        return true
      } else {
        // Student not found in database, clear invalid ID
        clearStudentId()
        console.log('⚠️ Saved student ID not found in database, cleared')
      }
    } catch (error) {
      console.error('❌ Auto-login failed:', error)
      clearStudentId()
    }
  }
  return false
}

// ============================================================
// URL ROUTE PARSING
// ============================================================

window.addEventListener('hashchange', () => render())