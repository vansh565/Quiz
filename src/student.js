/* ============================================================
   Professor Prabh — Student Flow
   ============================================================ */

import { supabase } from './supabase.js'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { state, navigate, setStudent, getStudentId, clearStudentId } from './state.js'
import * as db from './data.js'

const CHAPTER_ICONS = {
  'heat': '🔥', 'motion-time': '⚡', 'electric-current': '🔌',
  'light': '💡', 'magnetism': '🧲',
}
const CHAPTER_ICON_CLASSES = {
  'heat': 'heat', 'motion-time': 'motion', 'electric-current': 'electric',
  'light': 'light', 'magnetism': 'magnetism',
}

// ============================================================
// LANDING / ONBOARDING
// ============================================================
export function renderLanding() {
  return `
    <div class="pp-landing">
      <div class="pp-landing-content">
        <div class="pp-landing-logo">
          <img src="/logo.png" alt="Professor Prabh" class="pp-logo-image" />
        </div>
        <h1>Professor Prabh</h1>
        <p class="pp-landing-tagline">Learn • Build • Grow</p>
        <div class="pp-brand-quote">
          <p>"Seekho WITH PROFESSOR PRABH"</p>
          <div class="pp-brand-tags">
            <span>Technology</span>
            <span>Engineering</span>
            <span>Career</span>
            <span>Skills</span>
            <span>Stay Curious</span>
          </div>
        </div>
        <p>Learn physics the fun way! Watch videos, unlock secret codes, take quizzes, earn badges, and get your certificate!</p>
        <div class="pp-features">
          <div class="pp-feature"><div class="pp-feature-icon">🎬</div><div class="pp-feature-text">Video Lessons</div></div>
          <div class="pp-feature"><div class="pp-feature-icon">🔐</div><div class="pp-feature-text">Secret Codes</div></div>
          <div class="pp-feature"><div class="pp-feature-icon">🏆</div><div class="pp-feature-text">Earn Badges</div></div>
          <div class="pp-feature"><div class="pp-feature-icon">📜</div><div class="pp-feature-text">Certificate</div></div>
        </div>
        <button class="pp-btn pp-btn-primary pp-btn-lg pp-btn-block" onclick="document.getElementById('pp-onboarding-section').scrollIntoView({behavior:'smooth'})">
          Start Learning
        </button>
        <div style="margin-top:1.5rem">
          <button class="pp-btn pp-btn-ghost" onclick="window.location.hash='#verify'">Verify Certificate</button>
        </div>
        <div id="pp-onboarding-section" style="margin-top:2.5rem">
          ${renderOnboardingForm()}
        </div>
      </div>
    </div>
  `
}

function renderOnboardingForm() {
  return `
    <div class="pp-card pp-onboarding-card">
      <h2>Enter Your Details</h2>
      <p style="text-align:center;color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem">
        No password needed! Your progress is saved with your phone number.
      </p>
      <form id="pp-onboarding-form">
        <div class="pp-form-group">
          <label class="pp-label">Full Name</label>
          <input class="pp-input" type="text" name="name" required placeholder="Enter your name" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Phone Number</label>
          <input class="pp-input" type="tel" name="phone" required placeholder="Your phone number" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Class</label>
          <select class="pp-select" name="class_level" required>
            <option value="Class 7" selected>Class 7</option>
            <option value="Class 6">Class 6</option>
            <option value="Class 8">Class 8</option>
          </select>
        </div>
        <div id="pp-onboarding-error" class="pp-error-text pp-hidden"></div>
        <button type="submit" class="pp-btn pp-btn-primary pp-btn-block pp-btn-lg">Start Learning</button>
      </form>
    </div>
  `
}

export function attachOnboarding() {
  const form = document.getElementById('pp-onboarding-form')
  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const name = fd.get('name').trim()
    const phone = fd.get('phone').trim()
    const class_level = fd.get('class_level')
    const email = `student_${phone}@professorprabh.com`

    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.textContent = 'Loading...'
    const errEl = document.getElementById('pp-onboarding-error')
    errEl.classList.add('pp-hidden')

    try {
      const { student } = await db.findOrCreateStudent({ name, email, phone, class_level })
      setStudent(student)
      navigate('dashboard')
    } catch (err) {
      errEl.textContent = err.message || 'Something went wrong. Please try again.'
      errEl.classList.remove('pp-hidden')
      btn.disabled = false
      btn.textContent = 'Start Learning'
    }
  })
}

// ============================================================
// DASHBOARD
// ============================================================
export async function renderDashboard() {
  if (!state.student) {
    navigate('landing')
    return ''
  }

  try {
    const [courses, progress, studentBadges] = await Promise.all([
      db.getActiveCourses(),
      db.getStudentProgress(state.student.id),
      db.getStudentBadges(state.student.id),
    ])

    state.allBadges = studentBadges

    const course = courses.find(c => c.class_level === state.student.class_level) || courses[0]
    if (!course) return '<div class="pp-container"><p>No courses available yet.</p></div>'

    const chapters = await db.getChaptersByCourse(course.id)
    const badges = await db.getBadgesByCourse(course.id)
    const completedCount = progress.filter(p => p.completed).length
    const totalChapters = chapters.length
    const progressPct = totalChapters > 0 ? (completedCount / totalChapters) * 100 : 0
    const allComplete = completedCount === totalChapters && totalChapters > 0

    state.allComplete = allComplete

    // Get all quiz attempts for this student
    const allAttempts = await db.getAllAttempts()
    const studentAttempts = allAttempts.filter(a => a.student_id === state.student.id)
    
    const attemptMap = {}
    studentAttempts.forEach(a => {
      if (!attemptMap[a.chapter_id]) {
        attemptMap[a.chapter_id] = []
      }
      attemptMap[a.chapter_id].push(a)
    })

    let certSection = ''
    if (allComplete) {
      let cert = await db.getCertificateByStudent(state.student.id, course.id)
      if (!cert) {
        try {
          cert = await db.createCertificate(state.student, course)
          console.log('✅ Certificate created on dashboard load:', cert)
        } catch (err) {
          console.error('Failed to create certificate:', err)
        }
      }
      
      if (cert) {
        state.certificate = cert
        certSection = `
          <div class="pp-card pp-card-glow" style="text-align:center;margin-bottom:2rem;border:2px solid var(--warning-500)">
            <div style="font-size:3rem;margin-bottom:0.5rem">🎉</div>
            <h2 style="color:var(--warning-600)">Congratulations! You've completed all chapters!</h2>
            <p style="color:var(--text-muted);margin:0.5rem 0 1rem">You've earned the Class 7 Physics Champion Certificate</p>
            <button class="pp-btn pp-btn-primary" onclick="window.__ppViewCertificate('${cert.id}')">
              View Your Certificate
            </button>
          </div>
        `
      }
    }

    const progressMap = {}
    progress.forEach(p => { progressMap[p.chapter_id] = p })
    const badgeMap = {}
    studentBadges.forEach(b => { badgeMap[b.chapter_id] = b })

    const chapterCards = chapters.map(ch => {
      const prog = progressMap[ch.id]
      const badge = badgeMap[ch.id]
      const isCompleted = prog && prog.completed
      const hasBadge = !!badge
      const icon = CHAPTER_ICONS[ch.slug] || '📘'
      const iconClass = CHAPTER_ICON_CLASSES[ch.slug] || ''

      const attempts = attemptMap[ch.id] || []
      const attemptCount = attempts.length
      const lastAttempt = attempts[attemptCount - 1]
      const hasAttempted = attemptCount > 0
      const lastPassed = lastAttempt ? lastAttempt.passed : false

      let statusBadge = ''
      if (isCompleted) {
        statusBadge = '<span class="pp-chapter-status completed">✓ Completed</span>'
      } else if (hasAttempted && !lastPassed) {
        statusBadge = `<span class="pp-chapter-status failed">❌ Attempted (${attemptCount} tries)</span>`
      } else if (hasAttempted && lastPassed) {
        statusBadge = '<span class="pp-chapter-status completed">✓ Passed</span>'
      } else if (prog) {
        statusBadge = '<span class="pp-chapter-status in-progress">In Progress</span>'
      } else {
        statusBadge = '<span class="pp-chapter-status not-started">Not Started</span>'
      }

      return `
        <div class="pp-chapter-card ${isCompleted ? 'completed' : ''} ${hasAttempted && !lastPassed ? 'attempted' : ''}" onclick="window.__ppNav('chapter', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">
          ${hasBadge ? '<div class="pp-chapter-badge-tag">🏆</div>' : ''}
          <div class="pp-chapter-icon ${iconClass}">${icon}</div>
          <div class="pp-chapter-title">${ch.title}</div>
          <div class="pp-chapter-desc">${ch.description || ''}</div>
          ${statusBadge}
          ${hasAttempted && !lastPassed ? `<div class="pp-attempt-info">📝 Attempted: ${attemptCount} time${attemptCount > 1 ? 's' : ''}</div>` : ''}
        </div>
      `
    }).join('')

    return `
      <div class="pp-container">
        <div class="pp-dashboard-header">
          <h1>Welcome, ${state.student.name}!</h1>
          <p>${state.student.class_level} • ${course.name}</p>
          <button class="pp-btn pp-btn-secondary pp-btn-sm" onclick="window.__ppNav('achievements')">🏆 My Achievements</button>
        </div>
        ${certSection}
        <div class="pp-progress-overview">
          <h2>Your Progress</h2>
          <div class="pp-progress-count">${completedCount} / ${totalChapters}</div>
          <p style="opacity:0.85;font-size:0.85rem">Chapters Completed • ${studentBadges.length} Badges Earned</p>
          <div class="pp-progress-bar-container">
            <div class="pp-progress-bar" style="width:${progressPct}%"></div>
          </div>
        </div>
        <h2 style="margin-bottom:1rem;color:var(--gray-700)">Chapters</h2>
        <div class="pp-chapters-grid">${chapterCards}</div>
      </div>
    `
  } catch (err) {
    return `<div class="pp-container"><div class="pp-alert error">Error loading dashboard: ${err.message}</div></div>`
  }
}

// ============================================================
// VIEW CERTIFICATE
// ============================================================
window.__ppViewCertificate = function(certId) {
  console.log('📜 Viewing certificate with ID:', certId)
  
  if (typeof certId === 'string') {
    if (state.certificate && state.certificate.id === certId) {
      navigate('certificate', { certificate: state.certificate })
      return
    }
    
    db.getCertificateByStudent(state.student.id, null).then(cert => {
      if (cert) {
        state.certificate = cert
        window.__certificateData = cert
        navigate('certificate', { certificate: cert })
      } else {
        alert('Certificate not found. Please try again.')
      }
    }).catch(err => {
      console.error('Error fetching certificate:', err)
      alert('Error loading certificate. Please try again.')
    })
  } else {
    state.certificate = certId
    window.__certificateData = certId
    navigate('certificate', { certificate: certId })
  }
}

// ============================================================
// BADGE DOWNLOAD FUNCTIONS
// ============================================================

window.downloadBadge = function(badgeName, studentName) {
  console.log('📥 Downloading badge:', badgeName, 'for:', studentName)
  
  // Create badge element
  const badgeElement = document.createElement('div')
  badgeElement.className = 'badge-download-container'
  badgeElement.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 400px;
    height: 500px;
    background: linear-gradient(145deg, #1a1a2e, #0f0e17);
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(135deg, #f5d98e, #fbbf24, #f5d98e, #fbbf24);
    background-size: 300% 300%;
    animation: goldenShine 4s ease-in-out infinite;
    z-index: 9999;
  `
  
  badgeElement.innerHTML = `
    <div style="
      background: linear-gradient(145deg, #1a1a2e, #0f0e17);
      border-radius: 18px;
      padding: 2rem 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    ">
      <div style="font-size: 4rem; margin-bottom: 0.5rem;">🏅</div>
      <div style="
        font-size: 0.7rem;
        color: #fbbf24;
        text-transform: uppercase;
        letter-spacing: 3px;
        margin-bottom: 0.5rem;
      ">⭐ Certificate of Achievement</div>
      <div style="
        font-size: 1.8rem;
        font-weight: 700;
        color: #fbbf24;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 0.3rem;
        text-shadow: 0 0 30px rgba(251, 191, 36, 0.2);
      ">${badgeName}</div>
      <div style="
        font-size: 1rem;
        color: #94a3b8;
        margin-bottom: 0.5rem;
      ">Presented to</div>
      <div style="
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #f5d98e, #fbbf24);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-transform: uppercase;
        letter-spacing: 3px;
        margin-bottom: 1rem;
        font-family: 'Georgia', serif;
      ">${studentName}</div>
      <div style="
        font-size: 0.65rem;
        color: #64748b;
        margin-bottom: 1rem;
        border-top: 1px solid rgba(255,215,0,0.1);
        padding-top: 1rem;
        width: 60%;
      ">Earned on ${new Date().toLocaleDateString()}</div>
      <div style="
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
      ">
        <div style="font-size: 0.6rem; color: #64748b;">Professor Prabh</div>
        <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #fbbf24, transparent);"></div>
      </div>
      <div style="
        font-size: 0.5rem;
        color: #4a4a4a;
        margin-top: 0.5rem;
        letter-spacing: 1px;
      ">🏆 Professor Prabh Academy</div>
    </div>
  `
  
  document.body.appendChild(badgeElement)
  
  // Use html2canvas to capture the badge
  setTimeout(() => {
    html2canvas(badgeElement, {
      scale: 3,
      backgroundColor: null,
      allowTaint: false,
      useCORS: true,
      logging: false,
      width: 400,
      height: 500,
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png', 1.0)
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 130] // Small card size
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${badgeName.replace(/\s+/g, '_')}_Badge.pdf`)
      
      document.body.removeChild(badgeElement)
      
      showToast('✅ Badge downloaded successfully!', 'success')
    }).catch(err => {
      console.error('Badge download error:', err)
      document.body.removeChild(badgeElement)
      alert('Error downloading badge. Please try again.')
    })
  }, 200)
}

// ============================================================
// CERTIFICATE WITH DOWNLOAD
// ============================================================
export async function renderCertificate() {
  let cert = state.certificate || window.__certificateData
  
  const student = state.student
  
  if (!cert && student && student.id) {
    try {
      const courses = await db.getActiveCourses()
      const course = courses.find(c => c.class_level === student.class_level) || courses[0]
      if (course) {
        const fetchedCert = await db.getCertificateByStudent(student.id, course.id)
        if (fetchedCert) {
          cert = fetchedCert
          state.certificate = cert
          window.__certificateData = cert
        }
      }
    } catch (err) {
      console.error('Error fetching certificate:', err)
    }
  }
  
  if (!cert) {
    navigate('dashboard')
    return ''
  }

  let badges = []
  if (student && student.id) {
    try {
      badges = await db.getStudentBadges(student.id)
      state.allBadges = badges
      console.log('✅ Badges fetched from database:', badges.length)
    } catch (err) {
      console.error('Error fetching badges:', err)
    }
  }

  const issuedDate = new Date(cert.issued_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const badgeData = [
    { title: 'Heat', slug: 'heat', icon: '🔥', badgeName: 'Heat Master' },
    { title: 'Motion and Time', slug: 'motion-time', icon: '⚡', badgeName: 'Motion and Time Master' },
    { title: 'Electric Current', slug: 'electric-current', icon: '🔌', badgeName: 'Electric Current Master' },
    { title: 'Light', slug: 'light', icon: '💡', badgeName: 'Light Master' },
    { title: 'Magnetism', slug: 'magnetism', icon: '🧲', badgeName: 'Magnetism Master' }
  ]

  const earnedBadges = badgeData.map(ch => {
    const hasBadge = badges.some(b => {
      const chapterMatch = b.chapter?.slug === ch.slug || b.chapter_id === ch.id
      const badgeName = b.badges?.name || b.name || ''
      const nameMatch = badgeName === ch.badgeName
      const titleMatch = badgeName.toLowerCase().includes(ch.title.toLowerCase())
      const chapterTitleMatch = b.chapter?.title === ch.title
      return chapterMatch || nameMatch || titleMatch || chapterTitleMatch
    })
    return { ...ch, earned: hasBadge }
  })

  const earnedCount = earnedBadges.filter(b => b.earned).length

  const badgesHTML = earnedBadges.map(ch => {
    return `
      <div class="golden-badge ${ch.earned ? 'earned' : 'locked'}">
        <div class="golden-badge-inner">
          <div class="golden-badge-icon">${ch.earned ? '🏅' : '🔒'}</div>
          <div class="golden-badge-name">${ch.badgeName}</div>
          <div class="golden-badge-student">${student?.name || 'Student'}</div>
          <div class="golden-badge-status">${ch.earned ? '✅ Earned' : '⏳ Locked'}</div>
          ${ch.earned ? `<button class="badge-download-btn" onclick="window.downloadBadge('${ch.badgeName}', '${student?.name || 'Student'}')">📥 Download</button>` : ''}
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('dashboard')">← Back to Dashboard</button>
      
      <div class="certificate-wrapper" id="certificate-container">
        <div class="certificate-bg"></div>
        
        <div class="certificate-content">
          <div class="cert-header">
            <div class="cert-logo">🧑‍🔬</div>
            <div class="cert-title">Professor Prabh</div>
            <div class="cert-subtitle">Certificate of Excellence</div>
          </div>

          <div class="cert-body">
            <div class="cert-presented">This certificate is proudly presented to</div>
            <div class="cert-student-name">${student?.name || cert.student_name}</div>
            
            <div class="cert-program">
              for successfully completing the<br>
              <strong>${cert.program_name}</strong>
            </div>

            <div class="cert-achievement">with outstanding performance and dedication</div>

            <div class="golden-badges-section">
              <div class="golden-badges-title">🏆 Badges Earned (${earnedCount}/5)</div>
              <div class="golden-badges-grid">
                ${badgesHTML}
              </div>
            </div>

            <div class="cert-number">Certificate No: ${cert.certificate_number}</div>
          </div>

          <div class="cert-footer">
            <div class="cert-signature">
              <div class="cert-signature-line"></div>
              <div class="cert-signature-name">Professor Prabh</div>
              <div class="cert-signature-title">Founder, Professor Prabh Academy</div>
            </div>
            <div class="cert-date">
              <div class="cert-date-label">Date of Issue</div>
              <div class="cert-date-value">${issuedDate}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-top:1.5rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <button class="pp-btn pp-btn-primary" onclick="window.downloadCertificate()">
          📥 Download Certificate (PDF)
        </button>
        <button class="pp-btn pp-btn-secondary" onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
        <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('dashboard')">
          Back to Dashboard
        </button>
      </div>
    </div>
  `
}

// ============================================================
// MY ACHIEVEMENTS / HISTORY PAGE
// ============================================================
// src/student.js - Update renderAchievements function
// src/student.js - Updated renderAchievements function

export async function renderAchievements() {
  const student = state.student
  if (!student) { navigate('landing'); return '' }

  try {
    const [progress, studentBadges, attempts, certificates] = await Promise.all([
      db.getStudentProgress(student.id),
      db.getStudentBadges(student.id),
      db.getAttemptsByStudent(student.id, null),
      db.getAllCertificates()
    ])

    const studentCerts = certificates.filter(c => c.student_id === student.id)
    const chapters = await db.getAllChapters()
    const chapterMap = {}
    chapters.forEach(ch => { chapterMap[ch.id] = ch.title })

    // Get all badges to map badge_id to name
    const allBadges = await db.getAllBadges()
    const badgeMap = {}
    allBadges.forEach(b => { 
      badgeMap[b.id] = { name: b.name, chapter_id: b.chapter_id }
    })

    state.allBadges = studentBadges

    // Log to debug
    console.log('📊 Student Badges:', studentBadges)
    console.log('📊 All Badges:', allBadges)
    console.log('📊 Badge Map:', badgeMap)

    // Badge data with levels
    const badgeData = [
      { title: 'Heat', slug: 'heat', icon: '🔥', badgeName: 'Heat Master', level: 'Level 1' },
      { title: 'Motion and Time', slug: 'motion-time', icon: '⚡', badgeName: 'Motion and Time Master', level: 'Level 2' },
      { title: 'Electric Current', slug: 'electric-current', icon: '🔌', badgeName: 'Electric Current Master', level: 'Level 1' },
      { title: 'Light', slug: 'light', icon: '💡', badgeName: 'Light Master', level: 'Level 2' },
      { title: 'Magnetism', slug: 'magnetism', icon: '🧲', badgeName: 'Magnetism Master', level: 'Level 1' }
    ]

    // Create golden badges HTML for achievements page
    let badgesHTML = badgeData.map(ch => {
      // Check if this badge is earned by matching badge_id
      const hasBadge = studentBadges.some(sb => {
        // Get the badge info from the badgeMap using badge_id
        const badgeInfo = badgeMap[sb.badge_id]
        if (!badgeInfo) return false
        
        // Check if the badge name matches
        const nameMatch = badgeInfo.name === ch.badgeName
        // Check if the chapter matches
        const chapterMatch = badgeInfo.chapter_id === ch.id
        
        return nameMatch || chapterMatch
      })
      
      // Find the badge date if earned
      const badgeDate = studentBadges.find(sb => {
        const badgeInfo = badgeMap[sb.badge_id]
        if (!badgeInfo) return false
        return badgeInfo.name === ch.badgeName || badgeInfo.chapter_id === ch.id
      })

      const statusText = hasBadge ? 'Earned' : 'Locked'
      const dateText = hasBadge && badgeDate ? new Date(badgeDate.awarded_at || badgeDate.created_at).toLocaleDateString() : '—'
      
      return `
        <div class="golden-badge ${hasBadge ? 'earned' : 'locked'}">
          <div class="golden-badge-inner">
            <div class="golden-badge-icon">${hasBadge ? '🏅' : '🔒'}</div>
            <div class="golden-badge-title">${ch.badgeName}</div>
            <div class="golden-badge-student">${student.name}</div>
            <div class="golden-badge-level">${ch.level} • ${statusText}</div>
            ${hasBadge ? `<div class="golden-badge-date">${dateText}</div>` : ''}
            ${hasBadge ? `<button class="badge-download-btn" onclick="window.downloadBadge('${ch.badgeName}', '${student.name}')">📥 Download</button>` : ''}
          </div>
        </div>
      `
    }).join('')

    // Progress HTML
    let progressHTML = progress.map(p => {
      const chapterTitle = chapterMap[p.chapter_id] || 'Unknown Chapter'
      return `
        <div class="pp-history-item ${p.completed ? 'completed' : 'pending'}">
          <div class="pp-history-icon">${p.completed ? '✅' : '⏳'}</div>
          <div class="pp-history-info">
            <div class="pp-history-title">${chapterTitle}</div>
            <div class="pp-history-status">${p.completed ? 'Completed' : 'In Progress'}</div>
            ${p.completed_at ? `<div class="pp-history-date">${new Date(p.completed_at).toLocaleDateString()}</div>` : ''}
          </div>
        </div>
      `
    }).join('') || '<div class="pp-empty-state">No progress yet. Start learning!</div>'

    // Quiz Attempts HTML
    let attemptsHTML = attempts.slice(0, 20).map(a => {
      const quizTitle = a.quizzes?.title || 'Quiz'
      const chapterTitle = chapterMap[a.chapter_id] || 'Chapter'
      const status = a.passed ? '✅ Passed' : '❌ Failed'
      return `
        <div class="pp-history-item ${a.passed ? 'passed' : 'failed'}">
          <div class="pp-history-icon">${a.passed ? '🎉' : '📚'}</div>
          <div class="pp-history-info">
            <div class="pp-history-title">${quizTitle}</div>
            <div class="pp-history-subtitle">${chapterTitle}</div>
            <div class="pp-history-score">Score: ${a.score_percentage}% (${a.correct_count}/${a.total_questions})</div>
            <div class="pp-history-status">${status}</div>
            <div class="pp-history-date">${new Date(a.attempted_at || a.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      `
    }).join('') || '<div class="pp-empty-state">No quiz attempts yet.</div>'

    // Certificates HTML
    let certsHTML = ''
    if (studentCerts.length > 0) {
      certsHTML = studentCerts.map(cert => `
        <div class="pp-cert-card">
          <div class="pp-cert-icon">📜</div>
          <div class="pp-cert-info">
            <div class="pp-cert-title">${cert.program_name}</div>
            <div class="pp-cert-number">Certificate #: ${cert.certificate_number}</div>
            <div class="pp-cert-date">Issued: ${new Date(cert.issued_date).toLocaleDateString()}</div>
          </div>
          <button class="pp-btn pp-btn-primary pp-btn-sm" onclick="window.__ppViewCertificate('${cert.id}')">
            View Certificate
          </button>
        </div>
      `).join('')
    } else {
      certsHTML = `
        <div class="pp-empty-state">
          <p>No certificates yet. Complete all chapters to earn your certificate!</p>
        </div>
      `
    }

    return `
      <div class="pp-container pp-achievements-page">
        <div class="pp-achievements-header">
          <div>
            <h1>🏆 My Achievements</h1>
            <p>${student.name} • ${student.class_level}</p>
          </div>
          <button class="pp-back-btn" onclick="window.__ppNav('dashboard')">← Back to Dashboard</button>
        </div>

        <div class="pp-stats-grid">
          <div class="pp-stat-card">
            <div class="pp-stat-number">${progress.filter(p => p.completed).length}/${progress.length}</div>
            <div class="pp-stat-label">Chapters Completed</div>
          </div>
          <div class="pp-stat-card">
            <div class="pp-stat-number">${studentBadges.length}</div>
            <div class="pp-stat-label">Badges Earned</div>
          </div>
          <div class="pp-stat-card">
            <div class="pp-stat-number">${attempts.length}</div>
            <div class="pp-stat-label">Quiz Attempts</div>
          </div>
          <div class="pp-stat-card">
            <div class="pp-stat-number">${studentCerts.length}</div>
            <div class="pp-stat-label">Certificates</div>
          </div>
        </div>

        <div class="pp-section">
          <h2>🏅 My Golden Badges</h2>
          <div class="golden-badges-grid">
            ${badgesHTML}
          </div>
        </div>

        <div class="pp-section">
          <h2>📜 My Certificates</h2>
          <div class="pp-certs-grid">
            ${certsHTML}
          </div>
        </div>

        <div class="pp-section">
          <h2>📊 Chapter Progress</h2>
          <div class="pp-history-list">
            ${progressHTML}
          </div>
        </div>

        <div class="pp-section">
          <h2>📝 Quiz History</h2>
          <div class="pp-history-list">
            ${attemptsHTML}
          </div>
        </div>
      </div>
    `
  } catch (err) {
    console.error('renderAchievements error:', err)
    return `<div class="pp-container"><div class="pp-alert error">Error loading achievements: ${err.message}</div></div>`
  }
}
// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `pp-toast ${type}`
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// ============================================================
// DOWNLOAD CERTIFICATE FUNCTION
// ============================================================
window.downloadCertificate = function() {
  const certElement = document.getElementById('certificate-container')
  if (!certElement) {
    alert('Certificate element not found. Please try again.')
    return
  }

  const btn = document.querySelector('.pp-btn-primary')
  let originalText = ''
  if (btn) {
    originalText = btn.textContent
    btn.textContent = '⏳ Generating PDF...'
    btn.disabled = true
  }

  setTimeout(() => {
    generatePDF(certElement, btn, originalText)
  }, 500)
}

function generatePDF(element, btn, originalText) {
  try {
    const width = element.scrollWidth
    const height = element.scrollHeight
    
    console.log('📐 Certificate dimensions:', width, 'x', height)
    
    html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      allowTaint: false,
      useCORS: true,
      logging: false,
      width: width,
      height: height,
      windowWidth: width,
      windowHeight: height,
      onclone: function(doc) {
        const clone = doc.getElementById('certificate-container')
        if (clone) {
          clone.style.transform = 'none'
          clone.style.opacity = '1'
        }
      }
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      const imgAspectRatio = canvas.width / canvas.height
      const pdfAspectRatio = pdfWidth / pdfHeight
      
      let imgWidth, imgHeight
      if (imgAspectRatio > pdfAspectRatio) {
        imgWidth = pdfWidth
        imgHeight = pdfWidth / imgAspectRatio
      } else {
        imgHeight = pdfHeight
        imgWidth = pdfHeight * imgAspectRatio
      }
      
      const x = (pdfWidth - imgWidth) / 2
      const y = (pdfHeight - imgHeight) / 2
      
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST')
      
      const studentName = element.querySelector('.pp-cert-student-name')?.textContent || 'Student'
      const fileName = `Certificate_${studentName.replace(/\s+/g, '_')}.pdf`
      
      pdf.save(fileName)
      
      if (btn) {
        btn.textContent = originalText || '📥 Download Certificate (PDF)'
        btn.disabled = false
      }
      
      console.log('✅ PDF generated successfully!')
      
    }).catch(err => {
      console.error('PDF generation error:', err)
      alert('Error generating PDF. Please try again or use the Print button.')
      if (btn) {
        btn.textContent = originalText || '📥 Download Certificate (PDF)'
        btn.disabled = false
      }
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    alert('Error generating PDF. Please try again or use the Print button.')
    if (btn) {
      btn.textContent = originalText || '📥 Download Certificate (PDF)'
      btn.disabled = false
    }
  }
}

// ============================================================
// CHAPTER / VIDEO PAGE
// ============================================================
export async function renderChapter() {
  const ch = state.currentChapter
  if (!ch) { navigate('dashboard'); return '' }

  try {
    const videos = await db.getVideosByChapter(ch.id)
    const videoList = videos.length > 0 ? videos.map((v, i) => `
      <div class="pp-card pp-mb-2" style="cursor:pointer;${i === 0 ? '' : ''}" onclick="window.__ppSelectVideo('${v.id}')">
        <div class="pp-flex pp-items-center pp-gap-2">
          <div style="font-size:1.5rem">🎬</div>
          <div>
            <div style="font-weight:600">${v.title}</div>
            <div style="font-size:0.85rem;color:var(--text-muted)">${v.description || ''}</div>
          </div>
        </div>
      </div>
    `).join('') : '<p>No videos available for this chapter yet.</p>'

    const firstVideo = videos[0]

    return `
      <div class="pp-container">
        <button class="pp-back-btn" onclick="window.__ppNav('dashboard')">← Back to Dashboard</button>
        <div class="pp-card">
          <div class="pp-flex pp-items-center pp-gap-2 pp-mb-2">
            <div class="pp-chapter-icon ${CHAPTER_ICON_CLASSES[ch.slug] || ''}" style="margin-bottom:0">${CHAPTER_ICONS[ch.slug] || '📘'}</div>
            <div>
              <h1 style="font-size:1.5rem">${ch.title}</h1>
              <p style="color:var(--text-muted);font-size:0.9rem">${ch.description || ''}</p>
            </div>
          </div>
        </div>
        <div class="pp-mt-2">
          <h2 style="margin-bottom:1rem;color:var(--gray-700)">Video Lessons</h2>
          ${videoList}
        </div>
        ${firstVideo ? `
          <div class="pp-card pp-mt-2">
            <div class="pp-video-wrapper">
              <iframe src="https://www.youtube.com/embed/${firstVideo.youtube_id}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>
            </div>
            <div class="pp-video-info">
              <h2>${firstVideo.title}</h2>
              <p>${firstVideo.description || ''}</p>
            </div>
            <div class="pp-code-notice">
              <div class="pp-code-notice-icon">🔐</div>
              <div class="pp-code-notice-text">
                <strong>Watch the video to find the secret code!</strong><br>
                Enter the code to unlock the quiz for this chapter.
              </div>
            </div>
            <button class="pp-btn pp-btn-primary pp-mt-2" onclick="window.__ppNav('code', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">
              Enter Secret Code
            </button>
          </div>
        ` : ''}
      </div>
    `
  } catch (err) {
    return `<div class="pp-container"><div class="pp-alert error">Error: ${err.message}</div></div>`
  }
}

// ============================================================
// SECRET CODE ENTRY
// ============================================================
export function renderCodeEntry() {
  const ch = state.currentChapter
  if (!ch) { navigate('dashboard'); return '' }

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('chapter', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">← Back to Video</button>
      <div class="pp-card">
        <div class="pp-code-entry">
          <div style="font-size:3rem;margin-bottom:0.5rem">🔐</div>
          <h2>Enter Secret Code</h2>
          <p>Watch the video and enter the secret code to unlock the <strong>${ch.title}</strong> quiz!</p>
          <form id="pp-code-form">
            <input class="pp-input pp-code-input" type="text" name="code" required placeholder="ENTER CODE" autocomplete="off" />
            <div id="pp-code-error" class="pp-code-error pp-hidden">
              ❌ Invalid Secret Code. Please check the code and try again.
            </div>
            <button type="submit" class="pp-btn pp-btn-primary pp-btn-block pp-btn-lg pp-mt-2">Unlock Quiz</button>
          </form>
        </div>
      </div>
    </div>
  `
}

export function attachCodeEntry() {
  const form = document.getElementById('pp-code-form')
  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const code = new FormData(form).get('code')
    const errEl = document.getElementById('pp-code-error')
    errEl.classList.add('pp-hidden')

    try {
      const result = await db.validateSecretCode(code, state.currentChapter.id)
      if (!result.valid) {
        errEl.classList.remove('pp-hidden')
        return
      }
      const quiz = await db.getQuizByChapter(state.currentChapter.id)
      if (!quiz) {
        errEl.textContent = '❌ No quiz available for this chapter yet.'
        errEl.classList.remove('pp-hidden')
        return
      }
      navigate('quiz', { quiz, chapter: state.currentChapter })
    } catch (err) {
      errEl.textContent = '❌ ' + err.message
      errEl.classList.remove('pp-hidden')
    }
  })
}

// ============================================================
// QUIZ
// ============================================================
let quizQuestions = []
let quizAnswers = {}
let quizCurrentQ = 0

export async function renderQuiz() {
  const quiz = state.currentQuiz
  const ch = state.currentChapter
  if (!quiz) { navigate('dashboard'); return '' }

  try {
    quizQuestions = await db.getQuestionsByQuiz(quiz.id, quiz.max_questions || 10)
    quizAnswers = {}
    quizCurrentQ = 0

    if (quizQuestions.length === 0) {
      return `<div class="pp-container"><div class="pp-card pp-text-center"><p>No questions available for this quiz yet. Please check back later!</p></div></div>`
    }

    if (quiz.max_attempts) {
      const attempts = await db.getAttemptsByStudent(state.student.id, quiz.id)
      if (attempts.length >= quiz.max_attempts) {
        const passed = attempts.some(a => a.passed)
        if (passed) {
          return `<div class="pp-container"><div class="pp-card pp-text-center">
            <h2>You've already passed this quiz!</h2>
            <p style="color:var(--text-muted);margin:1rem 0">You've used all ${quiz.max_attempts} attempts.</p>
            <button class="pp-btn pp-btn-primary" onclick="window.__ppNav('dashboard')">Back to Dashboard</button>
          </div></div>`
        }
        return `<div class="pp-container"><div class="pp-card pp-text-center">
          <h2>Maximum attempts reached</h2>
          <p style="color:var(--text-muted);margin:1rem 0">You've used all ${quiz.max_attempts} attempts for this quiz.</p>
          <button class="pp-btn pp-btn-primary" onclick="window.__ppNav('dashboard')">Back to Dashboard</button>
        </div></div>`
      }
    }

    return renderQuizQuestion(quiz, ch)
  } catch (err) {
    return `<div class="pp-container"><div class="pp-alert error">Error: ${err.message}</div></div>`
  }
}

function renderQuizQuestion(quiz, ch) {
  const q = quizQuestions[quizCurrentQ]
  const total = quizQuestions.length
  const progressPct = ((quizCurrentQ + 1) / total) * 100
  const options = ['a','b','c','d']

  const optionsHTML = options.map(opt => `
    <div class="pp-option" data-answer="${opt}" onclick="window.__ppSelectAnswer('${opt}')">
      <div class="pp-option-letter">${opt.toUpperCase()}</div>
      <div class="pp-option-text">${q[`option_${opt}`]}</div>
    </div>
  `).join('')

  return `
    <div class="pp-container">
      <div class="pp-quiz-header">
        <h1>${ch.title} Quiz</h1>
        <div class="pp-quiz-meta">
          <span>📝 Question ${quizCurrentQ + 1} of ${total}</span>
          <span>🎯 Pass: ${quiz.passing_percentage}%</span>
        </div>
        <div class="pp-quiz-progress">
          <div class="pp-quiz-progress-bar" style="width:${progressPct}%"></div>
        </div>
      </div>
      <div class="pp-question-card" id="pp-quiz-question">
        <div class="pp-question-number">Question ${quizCurrentQ + 1}</div>
        <div class="pp-question-text">${q.question_text}</div>
        <div class="pp-options" id="pp-options">${optionsHTML}</div>
        <div class="pp-quiz-nav">
          ${quizCurrentQ > 0 ? `<button class="pp-btn pp-btn-secondary" onclick="window.__ppPrevQuestion()">← Previous</button>` : '<div></div>'}
          <button class="pp-btn pp-btn-primary" id="pp-next-btn" onclick="window.__ppNextQuestion()" disabled>
            ${quizCurrentQ === total - 1 ? 'Submit Quiz' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  `
}

export function attachQuiz() {
  window.__ppSelectAnswer = (opt) => {
    quizAnswers[quizCurrentQ] = opt
    document.querySelectorAll('.pp-option').forEach(el => el.classList.remove('selected'))
    document.querySelector(`.pp-option[data-answer="${opt}"]`)?.classList.add('selected')
    document.getElementById('pp-next-btn').disabled = false
  }

  window.__ppNextQuestion = () => {
    if (quizCurrentQ < quizQuestions.length - 1) {
      quizCurrentQ++
      const quiz = state.currentQuiz
      const ch = state.currentChapter
      document.querySelector('#app').innerHTML = ''
      document.querySelector('#app').innerHTML = renderQuizQuestion(quiz, ch)
      attachQuiz()
    } else {
      submitQuiz()
    }
  }

  window.__ppPrevQuestion = () => {
    if (quizCurrentQ > 0) {
      quizCurrentQ--
      const quiz = state.currentQuiz
      const ch = state.currentChapter
      document.querySelector('#app').innerHTML = ''
      document.querySelector('#app').innerHTML = renderQuizQuestion(quiz, ch)
      attachQuiz()
    }
  }
}

async function submitQuiz() {
  const quiz = state.currentQuiz
  const ch = state.currentChapter
  let correct = 0
  let wrong = 0
  const answers = {}

  quizQuestions.forEach((q, i) => {
    const studentAns = quizAnswers[i]
    answers[q.id] = studentAns
    if (studentAns === q.correct_answer) {
      correct++
    } else {
      wrong++
    }
  })

  const total = quizQuestions.length
  const percentage = Math.round((correct / total) * 100)
  const passed = percentage >= quiz.passing_percentage

  try {
    const attempt = await db.saveQuizAttempt({
      student_id: state.student.id,
      quiz_id: quiz.id,
      chapter_id: ch.id,
      answers: answers,
      total_questions: total,
      correct_count: correct,
      wrong_count: wrong,
      score_percentage: percentage,
      passed,
    })

    state.quizResult = attempt

    if (passed) {
      await db.markChapterComplete(state.student.id, ch.id)
      
      const courses = await db.getActiveCourses()
      const course = courses.find(c => c.class_level === state.student.class_level) || courses[0]
      
      if (course) {
        const badges = await db.getBadgesByCourse(course.id)
        const badge = badges.find(b => b.chapter_id === ch.id)
        
        if (badge) {
          console.log('🎯 Awarding badge:', badge.name)
          await db.awardBadge(state.student.id, ch.id, badge.id)
          
          const chapters = await db.getChaptersByCourse(course.id)
          const progress = await db.getStudentProgress(state.student.id)
          const completedCount = progress.filter(p => p.completed).length
          const allComplete = completedCount === chapters.length

          let certificate = null
          if (allComplete) {
            certificate = await db.getCertificateByStudent(state.student.id, course.id)
            if (!certificate) {
              certificate = await db.createCertificate(state.student, course)
              db.sendCertificateEmail(state.student, certificate)
            }
            state.certificate = certificate
          }

          navigate('badge', { badge, chapter: ch, result: attempt, certificate })
          return
        } else {
          console.warn('⚠️ No badge found for chapter:', ch.id)
        }
      }
    }

    navigate('result', { result: attempt, chapter: ch })
  } catch (err) {
    console.error('❌ Submit quiz error:', err)
    navigate('result', { result: { passed: false, error: err.message }, chapter: ch })
  }
}

// ============================================================
// QUIZ RESULT
// ============================================================
export async function renderResult() {
  const result = state.quizResult
  const ch = state.currentChapter
  if (!result) { navigate('dashboard'); return '' }

  if (result.error) {
    return `<div class="pp-container"><div class="pp-alert error">Error: ${result.error}</div>
      <button class="pp-btn pp-btn-primary" onclick="window.__ppNav('dashboard')">Back to Dashboard</button></div>`
  }

  const passed = result.passed
  const questions = quizQuestions.length > 0 ? quizQuestions : []
  const answers = result.answers || {}

  let attemptCount = 1
  try {
    const allAttempts = await db.getAllAttempts()
    const studentAttempts = allAttempts.filter(a => 
      a.student_id === state.student.id && 
      a.chapter_id === ch.id
    )
    attemptCount = studentAttempts.length
  } catch (err) {
    console.error('Error getting attempt count:', err)
  }

  let reviewHTML = ''
  if (questions.length > 0) {
    reviewHTML = `
      <div class="pp-answer-review">
        <h3>Answer Review</h3>
        ${questions.map((q, i) => {
          const studentAns = answers[q.id]
          const isCorrect = studentAns === q.correct_answer
          return `
            <div class="pp-answer-item ${isCorrect ? 'correct' : 'wrong'}">
              <div class="pp-answer-q">${i + 1}. ${q.question_text}</div>
              <div class="pp-answer-row"><span class="label">Your answer:</span> <span class="${isCorrect ? 'correct-text' : 'wrong-text'}">${studentAns ? studentAns.toUpperCase() + ' — ' + q[`option_${studentAns}`] : 'Not answered'}</span></div>
              <div class="pp-answer-row"><span class="label">Correct answer:</span> <span class="correct-text">${q.correct_answer.toUpperCase()} — ${q[`option_${q.correct_answer}`]}</span></div>
              ${q.explanation ? `<div class="pp-answer-explanation">💡 ${q.explanation}</div>` : ''}
            </div>
          `
        }).join('')}
      </div>
    `
  }

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('dashboard')">← Back to Dashboard</button>
      <div class="pp-card pp-result-card">
        <div class="pp-result-icon ${passed ? 'pass' : 'fail'}">${passed ? '🎉' : '📚'}</div>
        <h2 class="pp-result-title ${passed ? 'pass' : 'fail'}">${passed ? 'Congratulations! You Passed!' : 'Keep Learning!'}</h2>
        <p class="pp-result-subtitle">${passed ? `You've completed the ${ch.title} chapter!` : `You need ${state.currentQuiz?.passing_percentage || 80}% to pass. Try again!`}</p>
        <div class="pp-result-percentage ${passed ? 'pass' : 'fail'}">${result.score_percentage}%</div>
        ${!passed ? `<p style="color:var(--text-muted);font-size:0.9rem">Attempt ${attemptCount} of ${state.currentQuiz?.max_attempts || 'unlimited'}</p>` : ''}
        <div class="pp-result-stats">
          <div class="pp-stat-box"><div class="pp-stat-value">${result.total_questions}</div><div class="pp-stat-label">Total</div></div>
          <div class="pp-stat-box correct"><div class="pp-stat-value">${result.correct_count}</div><div class="pp-stat-label">Correct</div></div>
          <div class="pp-stat-box wrong"><div class="pp-stat-value">${result.wrong_count}</div><div class="pp-stat-label">Wrong</div></div>
          <div class="pp-stat-box"><div class="pp-stat-value">${result.passed ? 'PASS' : 'FAIL'}</div><div class="pp-stat-label">Result</div></div>
        </div>
        ${reviewHTML}
        <div class="pp-mt-2 pp-flex pp-gap-2 pp-justify-between" style="justify-content:center;flex-wrap:wrap">
          <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('dashboard')">Back to Dashboard</button>
          ${!passed ? `<button class="pp-btn pp-btn-primary" onclick="window.__ppNav('code', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">Try Again (Attempt ${attemptCount + 1})</button>` : ''}
        </div>
      </div>
    </div>
  `
}

// ============================================================
// BADGE CELEBRATION
// ============================================================
export function renderBadge() {
  const badge = state.earnedBadge
  const ch = state.currentChapter
  const result = state.quizResult
  const cert = state.certificate
  if (!badge) { navigate('dashboard'); return '' }

  return `
    <div class="pp-container">
      <div class="pp-card pp-badge-celebration">
        <div class="pp-badge-medal">🏆</div>
        <div class="pp-badge-name">${badge.name}</div>
        <div class="pp-badge-desc">${badge.description || ''}</div>
        <div class="pp-alert success" style="text-align:center">
          ✅ You scored ${result?.score_percentage}% on the ${ch?.title} quiz!
        </div>
        <div class="pp-alert info" style="text-align:center; background: #fef3c7; border-color: #f59e0b;">
          🎉 Badge saved to your account! Check your progress on the dashboard.
        </div>
        <div style="margin-top:1rem">
          <button class="pp-btn pp-btn-primary" onclick="window.downloadBadge('${badge.name}', '${state.student?.name || 'Student'}')">
            📥 Download Badge
          </button>
        </div>
        ${cert ? `
          <div class="pp-alert success" style="text-align:center;font-size:1rem;margin-top:1rem">
            🎉 You've completed ALL 5 chapters! Your certificate is ready!
          </div>
          <button class="pp-btn pp-btn-primary pp-btn-lg" onclick="window.__ppViewCertificate('${cert.id}')">
            View My Certificate
          </button>
        ` : ''}
        <div style="margin-top:1.5rem">
          <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('dashboard')">Back to Dashboard</button>
        </div>
      </div>
    </div>
  `
}

// ============================================================
// CERTIFICATE VERIFICATION
// ============================================================
export function renderVerify() {
  return `
    <div class="pp-verify-page">
      <div class="pp-verify-card">
        <div style="font-size:3rem;margin-bottom:0.5rem">📜</div>
        <h1>Certificate Verification</h1>
        <p>Enter the certificate number to verify its authenticity.</p>
        <form id="pp-verify-form">
          <input class="pp-input pp-code-input" type="text" name="cert_number" required placeholder="CP7-2026-000001" />
          <button type="submit" class="pp-btn pp-btn-primary pp-btn-block pp-btn-lg pp-mt-2">Verify Certificate</button>
        </form>
        <div id="pp-verify-result"></div>
      </div>
    </div>
  `
}

export function attachVerify() {
  const form = document.getElementById('pp-verify-form')
  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const certNum = new FormData(form).get('cert_number')
    const resultEl = document.getElementById('pp-verify-result')
    resultEl.innerHTML = '<div class="pp-loading"><div class="pp-spinner"></div></div>'

    try {
      const cert = await db.verifyCertificate(certNum)
      if (!cert) {
        resultEl.innerHTML = `
          <div class="pp-verify-result invalid">
            <h2>❌ Certificate Not Found</h2>
            <p>The certificate number <strong>${certNum}</strong> was not found in our records. Please check and try again.</p>
          </div>
        `
        return
      }
      const issuedDate = new Date(cert.issued_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      resultEl.innerHTML = `
        <div class="pp-verify-result valid">
          <h2>✅ Certificate Verified!</h2>
          <div class="pp-verify-detail">
            <div class="pp-verify-detail-row"><span class="key">Student Name</span><span class="val">${cert.student_name}</span></div>
            <div class="pp-verify-detail-row"><span class="key">Class</span><span class="val">${cert.class_level}</span></div>
            <div class="pp-verify-detail-row"><span class="key">Program</span><span class="val">${cert.program_name}</span></div>
            <div class="pp-verify-detail-row"><span class="key">Certificate No.</span><span class="val">${cert.certificate_number}</span></div>
            <div class="pp-verify-detail-row"><span class="key">Issue Date</span><span class="val">${issuedDate}</span></div>
          </div>
          <p style="color:var(--success-600);font-weight:600;margin-top:1rem">This certificate is authentic and verified by Professor Prabh.</p>
        </div>
      `
    } catch (err) {
      resultEl.innerHTML = `<div class="pp-verify-result invalid"><h2>Error</h2><p>${err.message}</p></div>`
    }
  })
}

// ============================================================
// STUDENT LOGOUT
// ============================================================
export function studentLogout() {
  clearStudentId()
  state.student = null
  navigate('landing')
}
