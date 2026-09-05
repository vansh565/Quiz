/* ============================================================
   Professor Photon — Student Flow
   ============================================================ */
// src/student.js - Add this at the top with other imports
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
        <div class="pp-landing-logo">🧑‍🔬</div>
        <h1>Professor Photon</h1>
        <p class="pp-landing-tagline">Class 7 Physics Learning Platform</p>
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
        No password needed! Your progress is saved with your email and phone number.
      </p>
      <form id="pp-onboarding-form">
        <div class="pp-form-group">
          <label class="pp-label">Full Name</label>
          <input class="pp-input" type="text" name="name" required placeholder="Enter your name" />
        </div>
        <div class="pp-form-group">
          <label class="pp-label">Email</label>
          <input class="pp-input" type="email" name="email" required placeholder="you@example.com" />
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
    const email = fd.get('email').trim()
    const phone = fd.get('phone').trim()
    const class_level = fd.get('class_level')

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

      let statusBadge = ''
      if (isCompleted) {
        statusBadge = '<span class="pp-chapter-status completed">✓ Completed</span>'
      } else if (prog) {
        statusBadge = '<span class="pp-chapter-status in-progress">In Progress</span>'
      } else {
        statusBadge = '<span class="pp-chapter-status not-started">Not Started</span>'
      }

      return `
        <div class="pp-chapter-card ${isCompleted ? 'completed' : ''}" onclick="window.__ppNav('chapter', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">
          ${hasBadge ? '<div class="pp-chapter-badge-tag">🏆</div>' : ''}
          <div class="pp-chapter-icon ${iconClass}">${icon}</div>
          <div class="pp-chapter-title">${ch.title}</div>
          <div class="pp-chapter-desc">${ch.description || ''}</div>
          ${statusBadge}
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
// CERTIFICATE WITH DOWNLOAD - FIXED VERSION
// ============================================================

// src/student.js - Replace renderCertificate with this

export async function renderCertificate() {
  let cert = state.certificate || window.__certificateData
  
  const student = state.student
  
  // If no certificate in state, try to fetch it
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

  // DIRECT DATABASE QUERY - Get student badges
  let badges = []
  if (student && student.id) {
    try {
      // Direct Supabase query for student badges
      const { data, error } = await supabase
        .from('student_badges')
        .select(`
          *,
          badges:badge_id (*),
          chapters:chapter_id (*)
        `)
        .eq('student_id', student.id)
      
      if (error) {
        console.error('Error fetching badges:', error)
      } else {
        badges = data || []
        state.allBadges = badges
        console.log('✅ Badges fetched directly:', badges.length)
        console.log('📊 Badge data:', JSON.stringify(badges, null, 2))
      }
    } catch (err) {
      console.error('Error in badge fetch:', err)
    }
  }

  // Also check if we have badges from the dashboard
  if (badges.length === 0 && state.allBadges && state.allBadges.length > 0) {
    badges = state.allBadges
    console.log('✅ Using badges from state:', badges.length)
  }

  const issuedDate = new Date(cert.issued_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  // Define badge names for each chapter
  const chapterBadgeMap = {
    'heat': { name: 'Heat Master', icon: '🔥' },
    'motion-time': { name: 'Motion and Time Master', icon: '⚡' },
    'electric-current': { name: 'Electric Current Master', icon: '🔌' },
    'light': { name: 'Light Master', icon: '💡' },
    'magnetism': { name: 'Magnetism Master', icon: '🧲' }
  }

  // Build badges HTML - Check if badge exists for each chapter
  const badgesHTML = Object.entries(chapterBadgeMap).map(([slug, info]) => {
    // Check if this chapter's badge is earned
    let hasBadge = false
    
    for (const b of badges) {
      // Check if badge has chapter data
      const badgeChapter = b.chapters || b.chapter || {}
      const badgeSlug = badgeChapter.slug || b.slug
      
      // Check if badge name matches
      const badgeName = b.badges?.name || b.name || ''
      
      if (badgeSlug === slug || badgeName === info.name || badgeName.includes(info.name)) {
        hasBadge = true
        break
      }
    }
    
    return `
      <div class="pp-cert-badge-item ${hasBadge ? 'earned' : 'locked'}">
        <div class="pp-cert-badge-icon">${hasBadge ? '🏆' : '🔒'}</div>
        <div class="pp-cert-badge-name">${info.icon} ${info.name}</div>
        <div class="pp-cert-badge-status">${hasBadge ? '✅ Earned' : '⏳ Pending'}</div>
      </div>
    `
  }).join('')

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('dashboard')">← Back to Dashboard</button>
      
      <div class="pp-cert-celebration">
        <h1 style="color:var(--primary-800);margin-bottom:0.5rem">🎉 Certificate Earned!</h1>
        <p style="color:var(--text-muted)">Congratulations on completing all 5 chapters!</p>
      </div>

      <div class="pp-cert-preview" id="certificate-container">
        <div class="pp-cert-header">
          <div class="pp-cert-logo">🧑‍🔬</div>
          <div>
            <div class="pp-cert-title">Professor Photon</div>
            <div class="pp-cert-subtitle">Class 7 Physics Learning Platform</div>
          </div>
        </div>
        
        <div style="text-align:center;margin:1.5rem 0">
          <div style="font-size:1.4rem;font-family:var(--font-display);color:var(--primary-800);font-weight:700">
            Certificate of Achievement
          </div>
        </div>
        
        <div class="pp-cert-body" style="text-align:center">
          <div class="pp-cert-presented">This certificate is proudly presented to</div>
          <div class="pp-cert-student-name">${student?.name || cert.student_name}</div>
          <div class="pp-cert-program">for successfully completing the<br>
            <strong>${cert.program_name}</strong><br>
            with dedication and excellence
          </div>
          <div class="pp-cert-number">Certificate No: ${cert.certificate_number}</div>
        </div>

        <!-- Badges Section -->
        <div class="pp-cert-badges-section">
          <h3>🏆 Badges Earned</h3>
          <div class="pp-cert-badges-grid">
            ${badgesHTML}
          </div>
        </div>

        <div class="pp-cert-footer">
          <div class="pp-cert-signature">
            <div class="pp-cert-signature-name">Dr. Prabhdeep Singh</div>
            <div class="pp-cert-signature-title">Director, Professor Photon Academy</div>
          </div>
          <div class="pp-cert-date">${issuedDate}</div>
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
// DOWNLOAD CERTIFICATE FUNCTION
// ============================================================
// src/student.js - Replace these functions

window.downloadCertificate = function() {
  const certElement = document.getElementById('certificate-container')
  if (!certElement) {
    alert('Certificate element not found. Please try again.')
    return
  }

  // Show loading
  const btn = document.querySelector('.pp-btn-primary')
  let originalText = ''
  if (btn) {
    originalText = btn.textContent
    btn.textContent = '⏳ Generating PDF...'
    btn.disabled = true
  }

  // Use a small delay to ensure everything is rendered
  setTimeout(() => {
    generatePDF(certElement, btn, originalText)
  }, 500)
}

function generatePDF(element, btn, originalText) {
  try {
    // Get the actual dimensions
    const width = element.scrollWidth
    const height = element.scrollHeight
    
    console.log('📐 Certificate dimensions:', width, 'x', height)
    
    // Use html2canvas with high quality settings
    html2canvas(element, {
      scale: 3,  // Higher scale for better quality
      backgroundColor: '#ffffff',
      allowTaint: false,
      useCORS: true,
      logging: false,
      width: width,
      height: height,
      windowWidth: width,
      windowHeight: height,
      onclone: function(doc) {
        // Ensure certificate is fully rendered in clone
        const clone = doc.getElementById('certificate-container')
        if (clone) {
          clone.style.transform = 'none'
          clone.style.opacity = '1'
        }
      }
    }).then(canvas => {
      // Convert to image
      const imgData = canvas.toDataURL('image/jpeg', 1.0)  // High quality JPEG
      
      // Create PDF with proper dimensions
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      // Get PDF page dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // Calculate image dimensions to fit perfectly
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
      
      // Center the image on the page
      const x = (pdfWidth - imgWidth) / 2
      const y = (pdfHeight - imgHeight) / 2
      
      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST')
      
      // Get student name for filename
      const studentName = element.querySelector('.pp-cert-student-name')?.textContent || 'Student'
      const fileName = `Certificate_${studentName.replace(/\s+/g, '_')}.pdf`
      
      // Save the PDF
      pdf.save(fileName)
      
      // Reset button
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
// MY ACHIEVEMENTS / HISTORY PAGE
// ============================================================

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

    const allBadges = await db.getAllBadges()
    const badgeMap = {}
    allBadges.forEach(b => { badgeMap[b.id] = b.name })

    state.allBadges = studentBadges

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

    let badgesHTML = ''
    if (studentBadges.length > 0) {
      badgesHTML = studentBadges.map(b => {
        const badgeName = badgeMap[b.badge_id] || b.badges?.name || 'Badge'
        const chapterTitle = chapterMap[b.chapter_id] || 'Chapter'
        return `
          <div class="pp-badge-card">
            <div class="pp-badge-icon">🏆</div>
            <div class="pp-badge-name">${badgeName}</div>
            <div class="pp-badge-chapter">${chapterTitle}</div>
            <div class="pp-badge-date">${new Date(b.awarded_at || b.created_at).toLocaleDateString()}</div>
          </div>
        `
      }).join('')
    } else {
      badgesHTML = '<div class="pp-empty-state">No badges earned yet. Keep learning!</div>'
    }

    let attemptsHTML = attempts.slice(0, 20).map(a => {
      const quizTitle = a.quizzes?.title || 'Quiz'
      const chapterTitle = chapterMap[a.chapter_id] || 'Chapter'
      return `
        <div class="pp-history-item ${a.passed ? 'passed' : 'failed'}">
          <div class="pp-history-icon">${a.passed ? '🎉' : '📚'}</div>
          <div class="pp-history-info">
            <div class="pp-history-title">${quizTitle}</div>
            <div class="pp-history-subtitle">${chapterTitle}</div>
            <div class="pp-history-score">Score: ${a.score_percentage}% (${a.correct_count}/${a.total_questions})</div>
            <div class="pp-history-status">${a.passed ? '✅ Passed' : '❌ Failed'}</div>
            <div class="pp-history-date">${new Date(a.attempted_at || a.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      `
    }).join('') || '<div class="pp-empty-state">No quiz attempts yet.</div>'

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
          <h2>📜 My Certificates</h2>
          <div class="pp-certs-grid">
            ${certsHTML}
          </div>
        </div>

        <div class="pp-section">
          <h2>🏆 My Badges</h2>
          <div class="pp-badges-grid">
            ${badgesHTML}
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

    if (passed) {
      await db.markChapterComplete(state.student.id, ch.id)
      const badges = await db.getBadgesByCourse((await db.getActiveCourses()).find(c => c.class_level === state.student.class_level)?.id)
      const badge = badges.find(b => b.chapter_id === ch.id)
      if (badge) {
        await db.awardBadge(state.student.id, ch.id, badge.id)
        db.sendBadgeEmail(state.student, badge, ch)

        const courses = await db.getActiveCourses()
        const course = courses.find(c => c.class_level === state.student.class_level) || courses[0]
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
      }
    }

    navigate('result', { result: attempt, chapter: ch })
  } catch (err) {
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
        <div class="pp-result-stats">
          <div class="pp-stat-box"><div class="pp-stat-value">${result.total_questions}</div><div class="pp-stat-label">Total</div></div>
          <div class="pp-stat-box correct"><div class="pp-stat-value">${result.correct_count}</div><div class="pp-stat-label">Correct</div></div>
          <div class="pp-stat-box wrong"><div class="pp-stat-value">${result.wrong_count}</div><div class="pp-stat-label">Wrong</div></div>
          <div class="pp-stat-box"><div class="pp-stat-value">${result.passed ? 'PASS' : 'FAIL'}</div><div class="pp-stat-label">Result</div></div>
        </div>
        ${reviewHTML}
        <div class="pp-mt-2 pp-flex pp-gap-2 pp-justify-between" style="justify-content:center;flex-wrap:wrap">
          <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('dashboard')">Back to Dashboard</button>
          ${!passed ? `<button class="pp-btn pp-btn-primary" onclick="window.__ppNav('code', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">Try Again</button>` : ''}
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
        ${cert ? `
          <div class="pp-alert success" style="text-align:center;font-size:1rem">
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
          <p style="color:var(--success-600);font-weight:600;margin-top:1rem">This certificate is authentic and verified by Professor Photon.</p>
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