/* ============================================================
   Professor Prabh — Student Flow (No Dashboard / No History)
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
// IN-MEMORY SESSION (no DB persistence for student progress)
// ============================================================
const session = {
  student: null,          // { name, class_level }
  course: null,           // active course for this class
  chapters: [],           // all chapters for the class
  completedChapters: [],  // array of chapter ids completed in this session
  badges: [],             // badges earned this session
  attempts: [],           // quiz attempts this session
  certificate: null,      // generated certificate object (in memory only)
}

// ============================================================
// LANDING / ONBOARDING (no phone)
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
        No password needed! Just enter your name and class to start.
      </p>
      <form id="pp-onboarding-form">
        <div class="pp-form-group">
          <label class="pp-label">Full Name</label>
          <input class="pp-input" type="text" name="name" required placeholder="Enter your name" />
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
    const class_level = fd.get('class_level')

    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.textContent = 'Loading...'
    const errEl = document.getElementById('pp-onboarding-error')
    errEl.classList.add('pp-hidden')

    try {
      // Reset session
      session.student = { name, class_level }
      session.completedChapters = []
      session.badges = []
      session.attempts = []
      session.certificate = null

      // Load chapters for this class
      const courses = await db.getActiveCourses()
      const course = courses.find(c => c.class_level === class_level) || courses[0]
      if (!course) {
        throw new Error('No courses available for this class yet.')
      }
      session.course = course
      session.chapters = await db.getChaptersByCourse(course.id)

      // 🔎 Pre-load videos for each chapter (so code page has them ready)
      try {
        for (const ch of session.chapters) {
          const videos = await db.getVideosByChapter(ch.id)
          ch._videos = videos || []
        }
      } catch (e) {
        console.warn('Could not preload videos:', e)
      }

      navigate('chapters')
    } catch (err) {
      errEl.textContent = err.message || 'Something went wrong. Please try again.'
      errEl.classList.remove('pp-hidden')
      btn.disabled = false
      btn.textContent = 'Start Learning'
    }
  })
}

// ============================================================
// CHAPTERS LIST (replaces dashboard)
// ============================================================
export async function renderChapters() {
  if (!session.student) {
    navigate('landing')
    return ''
  }

  const chapters = session.chapters
  const completed = session.completedChapters
  const allComplete = chapters.length > 0 && completed.length === chapters.length

  const chapterCards = chapters.map(ch => {
    const isCompleted = completed.includes(ch.id)
    const badge = session.badges.find(b => b.chapter_id === ch.id)
    const icon = CHAPTER_ICONS[ch.slug] || '📘'
    const iconClass = CHAPTER_ICON_CLASSES[ch.slug] || ''

    let statusBadge = ''
    if (isCompleted) {
      statusBadge = '<span class="pp-chapter-status completed">✓ Completed</span>'
    } else {
      statusBadge = '<span class="pp-chapter-status not-started">Start Quiz</span>'
    }

    return `
      <div class="pp-chapter-card ${isCompleted ? 'completed' : ''}" onclick="window.__ppOpenChapter('${ch.id}')">
        ${badge ? '<div class="pp-chapter-badge-tag">🏆</div>' : ''}
        <div class="pp-chapter-icon ${iconClass}">${icon}</div>
        <div class="pp-chapter-title">${ch.title}</div>
        <div class="pp-chapter-desc">${ch.description || ''}</div>
        ${statusBadge}
      </div>
    `
  }).join('')

  // Certificate section
  let certSection = ''
  if (allComplete) {
    if (!session.certificate) {
      session.certificate = {
        id: 'session-cert-' + Date.now(),
        certificate_number: generateCertNumber(),
        student_name: session.student.name,
        class_level: session.student.class_level,
        program_name: session.course?.name || 'Class 7 Physics',
        issued_date: new Date().toISOString(),
      }
      // Optional: save to DB so verification works
      try {
        if (typeof db.saveCertificate === 'function') {
          await db.saveCertificate(session.certificate)
        }
      } catch (e) {
        console.warn('Certificate DB save skipped:', e)
      }
    }
    certSection = `
      <div class="pp-card pp-card-glow" style="text-align:center;margin-bottom:2rem;border:2px solid var(--warning-500)">
        <div style="font-size:3rem;margin-bottom:0.5rem">🎉</div>
        <h2 style="color:var(--warning-600)">Congratulations! You've completed all chapters!</h2>
        <p style="color:var(--text-muted);margin:0.5rem 0 1rem">Your certificate is ready</p>
        <button class="pp-btn pp-btn-primary" onclick="window.__ppViewCertificate('${session.certificate.id}')">
          View Your Certificate
        </button>
      </div>
    `
  }

  return `
    <div class="pp-container">
      <div class="pp-dashboard-header">
        <h1>Welcome, ${session.student.name}!</h1>
        <p>${session.student.class_level} • ${session.course?.name || ''}</p>
      </div>
      ${certSection}
      <div class="pp-progress-overview">
        <h2>Your Progress</h2>
        <div class="pp-progress-count">${completed.length} / ${chapters.length}</div>
        <p style="opacity:0.85;font-size:0.85rem">Chapters Completed • ${session.badges.length} Badges Earned</p>
        <div class="pp-progress-bar-container">
          <div class="pp-progress-bar" style="width:${chapters.length > 0 ? (completed.length / chapters.length) * 100 : 0}%"></div>
        </div>
      </div>
      <h2 style="margin-bottom:1rem;color:var(--gray-700)">Choose a Chapter to Quiz</h2>
      <div class="pp-chapters-grid">${chapterCards}</div>
      <div style="text-align:center;margin-top:2rem">
        <button class="pp-btn pp-btn-ghost" onclick="window.__ppExit()">Exit / Start Over</button>
      </div>
    </div>
  `
}

// ============================================================
// OPEN CHAPTER -> directly go to code entry
// ============================================================
window.__ppOpenChapter = function(chapterId) {
  const ch = session.chapters.find(c => c.id === chapterId)
  if (!ch) return
  state.currentChapter = ch
  navigate('code', { chapter: ch })
}

window.__ppExit = function() {
  session.student = null
  session.course = null
  session.chapters = []
  session.completedChapters = []
  session.badges = []
  session.attempts = []
  session.certificate = null
  clearStudentId()
  state.student = null
  navigate('landing')
}

// ============================================================
// SECRET CODE ENTRY
//   ✅ Form on top
//   ✅ YouTube video shown BELOW (fetched from chapter OR videos table)
// ============================================================
export async function renderCodeEntry() {
  const ch = state.currentChapter
  if (!ch || !session.student) { navigate('landing'); return '' }

  // 🔎 Try to find a YouTube URL from multiple sources
  let youtubeUrl =
    ch.youtube_url ||
    ch.video_url ||
    ch.youtube_link ||
    ''

  // If chapter has no URL, try the videos array (already preloaded)
  if (!youtubeUrl && Array.isArray(ch._videos) && ch._videos.length > 0) {
    const v = ch._videos[0]
    youtubeUrl = v.youtube_url || v.video_url || v.url || v.youtube_id || ''
  }

  // If still nothing, fetch fresh from DB
  if (!youtubeUrl) {
    try {
      const videos = await db.getVideosByChapter(ch.id)
      if (videos && videos.length > 0) {
        const v = videos[0]
        youtubeUrl = v.youtube_url || v.video_url || v.url || v.youtube_id || ''
        ch._videos = videos
      }
    } catch (e) {
      console.warn('Could not fetch videos:', e)
    }
  }

  const videoId = extractYouTubeId(youtubeUrl)

  console.log('🎬 Video URL found:', youtubeUrl, '→ ID:', videoId)

  const videoSection = videoId
    ? `
      <div class="pp-card pp-mt-2">
        <div class="pp-video-wrapper">
          <iframe
            src="https://www.youtube.com/embed/${videoId}"
            title="${ch.title} video lesson"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        <div class="pp-video-info">
          <h2>${ch.title} — Video Lesson</h2>
          <p>Watch the video to find the secret code!</p>
        </div>
        <div class="pp-code-notice">
          <div class="pp-code-notice-icon">🔐</div>
          <div class="pp-code-notice-text">
            <strong>Watch the video to find the secret code!</strong><br>
            Enter the code above to unlock the quiz for this chapter.
          </div>
        </div>
      </div>
    `
    : `
      <div class="pp-card pp-mt-2" style="text-align:center;padding:1.5rem;background:#fef3c7;border:1px solid #f59e0b">
        <div style="font-size:2rem;margin-bottom:0.5rem">🎬</div>
        <p style="color:#92400e;font-weight:600;margin:0">No video added for this chapter yet.</p>
        <p style="color:#92400e;font-size:0.85rem;margin-top:0.25rem">Ask your teacher to add a YouTube video.</p>
      </div>
    `

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('chapters')">← Back to Chapters</button>

      <div class="pp-card">
        <div class="pp-code-entry">
          <div style="font-size:3rem;margin-bottom:0.5rem">🔐</div>
          <h2>Enter Secret Code</h2>
          <p>Enter the secret code to unlock the <strong>${ch.title}</strong> quiz!</p>
          <form id="pp-code-form">
            <input class="pp-input pp-code-input" type="text" name="code" required placeholder="ENTER CODE" autocomplete="off" />
            <div id="pp-code-error" class="pp-code-error pp-hidden">
              ❌ Invalid Secret Code. Please check the code and try again.
            </div>
            <button type="submit" class="pp-btn pp-btn-primary pp-btn-block pp-btn-lg pp-mt-2">Unlock Quiz</button>
          </form>
        </div>
      </div>

      ${videoSection}
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
// QUIZ (shuffled questions AND options on every attempt)
// ============================================================
let quizQuestions = []
let quizAnswers = {}
let quizCurrentQ = 0

export async function renderQuiz() {
  const quiz = state.currentQuiz
  const ch = state.currentChapter
  if (!quiz) { navigate('chapters'); return '' }

  try {
    let fetched = await db.getQuestionsByQuiz(quiz.id, quiz.max_questions || 10)

    // 🔀 SHUFFLE QUESTIONS ON EVERY ATTEMPT
    fetched = shuffleArray(fetched)

    // 🔀 ALSO SHUFFLE OPTIONS INSIDE EACH QUESTION
    fetched = fetched.map(q => shuffleQuestionOptions(q))

    quizQuestions = fetched
    quizAnswers = {}
    quizCurrentQ = 0

    if (quizQuestions.length === 0) {
      return `<div class="pp-container"><div class="pp-card pp-text-center"><p>No questions available for this quiz yet. Please check back later!</p></div></div>`
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

  // Store attempt in session memory only
  session.attempts.push({
    chapter_id: ch.id,
    chapter_title: ch.title,
    score: percentage,
    correct,
    wrong,
    total,
    passed,
    attempted_at: new Date().toISOString(),
  })

  const result = {
    total_questions: total,
    correct_count: correct,
    wrong_count: wrong,
    score_percentage: percentage,
    passed,
    answers,
  }
  state.quizResult = result

  if (passed) {
    // Mark chapter complete in session
    if (!session.completedChapters.includes(ch.id)) {
      session.completedChapters.push(ch.id)
    }

    // Award badge (in memory only)
    const badgeName = getBadgeNameForChapter(ch.slug, ch.title)
    const badgeIcon = CHAPTER_ICONS[ch.slug] || '🏅'
    if (!session.badges.find(b => b.chapter_id === ch.id)) {
      session.badges.push({
        chapter_id: ch.id,
        chapter_title: ch.title,
        badge_name: badgeName,
        badge_icon: badgeIcon,
        earned_at: new Date().toISOString(),
      })
    }

    // Check if all chapters complete
    const allComplete = session.chapters.length > 0 && session.completedChapters.length === session.chapters.length
    let certificate = null
    if (allComplete) {
      if (!session.certificate) {
        session.certificate = {
          id: 'session-cert-' + Date.now(),
          certificate_number: generateCertNumber(),
          student_name: session.student.name,
          class_level: session.student.class_level,
          program_name: session.course?.name || 'Class 7 Physics',
          issued_date: new Date().toISOString(),
        }
        try {
          if (typeof db.saveCertificate === 'function') {
            await db.saveCertificate(session.certificate)
          }
        } catch (e) {
          console.warn('Certificate DB save skipped:', e)
        }
      }
      certificate = session.certificate
    }

    state.earnedBadge = {
      name: badgeName,
      description: `You mastered ${ch.title}!`,
      icon: badgeIcon,
    }
    navigate('badge', { badge: state.earnedBadge, chapter: ch, result, certificate })
    return
  }

  navigate('result', { result, chapter: ch })
}

// ============================================================
// QUIZ RESULT
//   ✅ Answer review only when PASSED.
//   ❌ Failed → friendly message, no answers revealed.
// ============================================================
export async function renderResult() {
  const result = state.quizResult
  const ch = state.currentChapter
  if (!result) { navigate('chapters'); return '' }

  const passed = result.passed
  const questions = quizQuestions.length > 0 ? quizQuestions : []
  const answers = result.answers || {}

  let reviewHTML = ''
  if (passed && questions.length > 0) {
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
  } else if (!passed) {
    reviewHTML = `
      <div class="pp-card" style="text-align:center;padding:1.5rem;background:#fff7ed;border:1px solid #fdba74;margin-top:1rem">
        <div style="font-size:2rem;margin-bottom:0.5rem">📚</div>
        <p style="color:#9a3412;font-weight:600;margin:0">Don't worry! Review your notes and try again.</p>
        <p style="color:#9a3412;font-size:0.85rem;margin-top:0.25rem">Answers are not shown — ask your teacher if you need help.</p>
      </div>
    `
  }

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('chapters')">← Back to Chapters</button>
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
          <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('chapters')">Back to Chapters</button>
          ${!passed ? `<button class="pp-btn pp-btn-primary" onclick="window.__ppNav('code', {chapter: ${JSON.stringify(ch).replace(/"/g, '&quot;')}})">Try Again</button>` : ''}
        </div>
      </div>
    </div>
  `
}

// ============================================================
// BADGE CELEBRATION (in-memory, download anytime)
// ============================================================
export function renderBadge() {
  const badge = state.earnedBadge
  const ch = state.currentChapter
  const result = state.quizResult
  const cert = session.certificate
  if (!badge) { navigate('chapters'); return '' }

  const allComplete = session.chapters.length > 0 && session.completedChapters.length === session.chapters.length

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
          🎉 Badge earned! Download it now or it will be lost when you leave.
        </div>
        <div style="margin-top:1rem">
          <button class="pp-btn pp-btn-primary" onclick="window.downloadBadge('${badge.name}', '${session.student?.name || 'Student'}')">
            📥 Download Badge
          </button>
        </div>
        ${allComplete && cert ? `
          <div class="pp-alert success" style="text-align:center;font-size:1rem;margin-top:1rem">
            🎉 You've completed ALL chapters! Your certificate is ready!
          </div>
          <button class="pp-btn pp-btn-primary pp-btn-lg" onclick="window.__ppViewCertificate('${cert.id}')">
            View My Certificate
          </button>
        ` : ''}
        <div style="margin-top:1.5rem">
          <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('chapters')">Back to Chapters</button>
        </div>
      </div>
    </div>
  `
}

// ============================================================
// CERTIFICATE (in-memory, download anytime)
// ============================================================
export async function renderCertificate() {
  const cert = session.certificate
  if (!cert) {
    navigate('chapters')
    return ''
  }

  const student = session.student
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
    const matchingChapter = session.chapters.find(c => c.slug === ch.slug)
    const hasBadge = session.badges.some(b =>
      (matchingChapter && b.chapter_id === matchingChapter.id) ||
      b.badge_name === ch.badgeName
    )
    return { ...ch, earned: hasBadge }
  })

  const earnedCount = earnedBadges.filter(b => b.earned).length

  const badgesHTML = earnedBadges.map(ch => `
    <div class="golden-badge ${ch.earned ? 'earned' : 'locked'}">
      <div class="golden-badge-inner">
        <div class="golden-badge-icon">${ch.earned ? '🏅' : '🔒'}</div>
        <div class="golden-badge-name">${ch.badgeName}</div>
        <div class="golden-badge-student">${student?.name || 'Student'}</div>
        <div class="golden-badge-status">${ch.earned ? '✅ Earned' : '⏳ Locked'}</div>
        ${ch.earned ? `<button class="badge-download-btn" onclick="window.downloadBadge('${ch.badgeName}', '${student?.name || 'Student'}')">📥 Download</button>` : ''}
      </div>
    </div>
  `).join('')

  return `
    <div class="pp-container">
      <button class="pp-back-btn" onclick="window.__ppNav('chapters')">← Back to Chapters</button>
      
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
        <button class="pp-btn pp-btn-secondary" onclick="window.__ppNav('chapters')">
          Back to Chapters
        </button>
      </div>
    </div>
  `
}

// ============================================================
// VIEW CERTIFICATE (in-memory)
// ============================================================
window.__ppViewCertificate = function(certId) {
  if (session.certificate && session.certificate.id === certId) {
    navigate('certificate', { certificate: session.certificate })
  } else if (session.certificate) {
    navigate('certificate', { certificate: session.certificate })
  } else {
    alert('Certificate not available. Please complete all chapters first.')
  }
}

// ============================================================
// BADGE DOWNLOAD
// ============================================================
window.downloadBadge = function(badgeName, studentName) {
  console.log('📥 Downloading badge:', badgeName, 'for:', studentName)

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
        format: [105, 130]
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
// DOWNLOAD CERTIFICATE
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

      const studentName = element.querySelector('.cert-student-name')?.textContent || 'Student'
      const fileName = `Certificate_${studentName.replace(/\s+/g, '_')}.pdf`

      pdf.save(fileName)

      if (btn) {
        btn.textContent = originalText || '📥 Download Certificate (PDF)'
        btn.disabled = false
      }
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
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `pp-toast ${type}`
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// ============================================================
// HELPERS
// ============================================================
function getBadgeNameForChapter(slug, title) {
  const map = {
    'heat': 'Heat Master',
    'motion-time': 'Motion and Time Master',
    'electric-current': 'Electric Current Master',
    'light': 'Light Master',
    'magnetism': 'Magnetism Master',
  }
  return map[slug] || `${title} Master`
}

function generateCertNumber() {
  const year = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  return `CP7-${year}-${random}`
}

// ---- SHUFFLE HELPERS ----
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleQuestionOptions(q) {
  const letters = ['a', 'b', 'c', 'd']
  const opts = letters.map(l => ({ letter: l, text: q[`option_${l}`] }))
  const shuffled = shuffleArray(opts)

  const newQ = { ...q }
  shuffled.forEach((o, idx) => {
    const newLetter = letters[idx]
    newQ[`option_${newLetter}`] = o.text
    if (o.letter === q.correct_answer) {
      newQ.correct_answer = newLetter
    }
  })
  return newQ
}

// ---- YOUTUBE HELPER ----
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return ''
  url = url.trim()
  if (!url) return ''

  // Already a raw 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return ''
}

// ============================================================
// CERTIFICATE VERIFICATION (uses DB)
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
// LOGOUT / START OVER
// ============================================================
export function studentLogout() {
  window.__ppExit()
}
