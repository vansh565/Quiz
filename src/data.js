/* ============================================================
   Professor Photon — Data Access Layer
   All Supabase queries go through here
   ============================================================ */

import { supabase, FUNCTIONS_URL } from './supabase.js'

// ============================================================
// STUDENTS
// ============================================================
export async function findOrCreateStudent({ name, email, phone, class_level }) {
  try {
    // First try to find existing student by email
    const { data: existing, error: findError } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (findError) {
      console.error('Error finding student:', findError)
      throw new Error('Database error: ' + findError.message)
    }

    // If student exists, update and return
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('students')
        .update({ 
          name, 
          phone, 
          class_level,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating student:', updateError)
        return { student: existing, isNew: false }
      }
      
      return { student: updated, isNew: false }
    }

    // Create new student
    const { data: newStudent, error: createError } = await supabase
      .from('students')
      .insert({ 
        name, 
        email, 
        phone, 
        class_level,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating student:', createError)
      
      // If duplicate, try to fetch existing
      if (createError.code === '23505') {
        const { data: existingStudent } = await supabase
          .from('students')
          .select('*')
          .eq('email', email)
          .maybeSingle()
        
        if (existingStudent) {
          return { student: existingStudent, isNew: false }
        }
      }
      
      throw new Error('Failed to create student: ' + createError.message)
    }

    return { student: newStudent, isNew: true }
  } catch (error) {
    console.error('findOrCreateStudent error:', error)
    throw error
  }
}

export async function getStudentById(id) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error('getStudentById error:', error)
    return null
  }
}

export async function getAllStudents(search = '') {
  try {
    let query = supabase.from('students').select('*').order('created_at', { ascending: false })
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllStudents error:', error)
    return []
  }
}

// ============================================================
// COURSE STRUCTURE
// ============================================================
export async function getActiveCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getActiveCourses error:', error)
    return []
  }
}

export async function getAllCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllCourses error:', error)
    return []
  }
}

export async function getChaptersByCourse(courseId) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getChaptersByCourse error:', error)
    return []
  }
}

export async function getAllChapters() {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .order('sort_order')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllChapters error:', error)
    return []
  }
}

export async function getVideosByChapter(chapterId) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getVideosByChapter error:', error)
    return []
  }
}

export async function getAllVideos() {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllVideos error:', error)
    return []
  }
}

// ============================================================
// SECRET CODES
// ============================================================
export async function validateSecretCode(code, chapterId) {
  try {
    console.log('🔍 Validating code:', code)
    console.log('📚 Chapter ID:', chapterId)
    
    const { data, error } = await supabase
      .from('secret_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle()
    
    console.log('📊 Query result:', data)
    console.log('❌ Error:', error)
    
    if (error) {
      return { valid: false, message: 'Database error: ' + error.message }
    }
    
    if (!data) {
      return { valid: false, message: 'Invalid secret code' }
    }
    
    if (data.chapter_id !== chapterId) {
      return { valid: false, message: 'This code is for a different chapter' }
    }
    
    return { valid: true, secretCode: data }
  } catch (error) {
    console.error('validateSecretCode error:', error)
    return { valid: false, message: error.message }
  }
}

export async function getSecretCodesByChapter(chapterId) {
  try {
    const { data, error } = await supabase
      .from('secret_codes')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getSecretCodesByChapter error:', error)
    return []
  }
}

export async function getAllSecretCodes() {
  try {
    const { data, error } = await supabase
      .from('secret_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllSecretCodes error:', error)
    return []
  }
}

// ============================================================
// QUIZZES & QUESTIONS
// ============================================================
export async function getQuizByChapter(chapterId) {
  try {
    console.log('🎯 Getting quiz for chapter:', chapterId)
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)
      .maybeSingle()
    
    console.log('📝 Quiz found:', data)
    
    if (error) {
      console.error('Error getting quiz:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('getQuizByChapter error:', error)
    return null
  }
}

export async function getQuestionsByQuiz(quizId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('is_active', true)
      .order('sort_order')
      .limit(limit)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getQuestionsByQuiz error:', error)
    return []
  }
}

export async function getAllQuizzes() {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllQuizzes error:', error)
    return []
  }
}

export async function getAllQuestions(quizId = null) {
  try {
    let query = supabase.from('questions').select('*').order('sort_order')
    if (quizId) query = query.eq('quiz_id', quizId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllQuestions error:', error)
    return []
  }
}

// ============================================================
// QUIZ ATTEMPTS
// ============================================================
export async function saveQuizAttempt(attempt) {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert(attempt)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error('saveQuizAttempt error:', error)
    throw error
  }
}

export async function getAttemptsByStudent(studentId, quizId) {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('attempted_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAttemptsByStudent error:', error)
    return []
  }
}

export async function getAllAttempts() {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order('attempted_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllAttempts error:', error)
    return []
  }
}

// ============================================================
// CHAPTER PROGRESS
// ============================================================
export async function getStudentProgress(studentId) {
  try {
    const { data, error } = await supabase
      .from('chapter_progress')
      .select('*')
      .eq('student_id', studentId)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getStudentProgress error:', error)
    return []
  }
}

export async function markChapterComplete(studentId, chapterId) {
  try {
    // Try RPC first
    const { data, error } = await supabase
      .rpc('mark_chapter_complete', {
        p_student_id: studentId,
        p_chapter_id: chapterId
      })
    
    if (error) {
      console.error('RPC markChapterComplete error:', error)
      // Fallback: direct insert/update
      return await markChapterCompleteFallback(studentId, chapterId)
    }
    
    return data
  } catch (error) {
    console.error('markChapterComplete error:', error)
    return await markChapterCompleteFallback(studentId, chapterId)
  }
}

async function markChapterCompleteFallback(studentId, chapterId) {
  try {
    const { data: existing } = await supabase
      .from('chapter_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('chapter_id', chapterId)
      .maybeSingle()
    
    if (existing) {
      const { error } = await supabase
        .from('chapter_progress')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', existing.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('chapter_progress')
        .insert({
          student_id: studentId,
          chapter_id: chapterId,
          completed: true,
          completed_at: new Date().toISOString()
        })
      
      if (error) throw error
    }
    
    return true
  } catch (error) {
    console.error('Fallback markChapterComplete error:', error)
    return false
  }
}

// ============================================================
// BADGES
// ============================================================
export async function getBadgesByCourse(courseId) {
  try {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('course_id', courseId)
    if (!chapters) return []
    const chapterIds = chapters.map(c => c.id)
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .in('chapter_id', chapterIds)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getBadgesByCourse error:', error)
    return []
  }
}

export async function getAllBadges() {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('created_at')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllBadges error:', error)
    return []
  }
}

export async function getStudentBadges(studentId) {
  try {
    const { data, error } = await supabase
      .from('student_badges')
      .select('*')
      .eq('student_id', studentId)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getStudentBadges error:', error)
    return []
  }
}

export async function awardBadge(studentId, chapterId, badgeId) {
  try {
    // Try RPC first
    const { data, error } = await supabase
      .rpc('award_badge', {
        p_student_id: studentId,
        p_chapter_id: chapterId,
        p_badge_id: badgeId
      })
    
    if (error) {
      console.error('RPC awardBadge error:', error)
      // Fallback: direct insert
      return await awardBadgeFallback(studentId, chapterId, badgeId)
    }
    
    return data
  } catch (error) {
    console.error('awardBadge error:', error)
    return await awardBadgeFallback(studentId, chapterId, badgeId)
  }
}

async function awardBadgeFallback(studentId, chapterId, badgeId) {
  try {
    // Check if already awarded
    const { data: existing } = await supabase
      .from('student_badges')
      .select('*')
      .eq('student_id', studentId)
      .eq('badge_id', badgeId)
      .maybeSingle()
    
    if (existing) {
      return true
    }
    
    // Insert directly
    const { error } = await supabase
      .from('student_badges')
      .insert({
        student_id: studentId,
        badge_id: badgeId,
        chapter_id: chapterId,
        awarded_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Fallback badge award error:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Fallback badge award error:', error)
    return false
  }
}

// ============================================================
// CERTIFICATES
// ============================================================
export async function getCertificateByStudent(studentId, courseId) {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error('getCertificateByStudent error:', error)
    return null
  }
}

export async function getAllCertificates(search = '') {
  try {
    let query = supabase.from('certificates').select('*').order('issued_date', { ascending: false })
    if (search) {
      query = query.or(`certificate_number.ilike.%${search}%,student_name.ilike.%${search}%`)
    }
    const { data, error } = await query.limit(100)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllCertificates error:', error)
    return []
  }
}

export async function verifyCertificate(certNumber) {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_number', certNumber.toUpperCase().trim())
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error('verifyCertificate error:', error)
    return null
  }
}
// src/data.js - Fix createCertificate

export async function createCertificate(student, course) {
  try {
    // Generate a unique certificate number
    const certNumber = `CP7-2026-${String(Math.floor(100000 + Math.random() * 900000))}`
    
    // Check if certificate already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', student.id)
      .eq('course_id', course.id)
      .maybeSingle()
    
    if (existing) {
      console.log('✅ Certificate already exists:', existing.certificate_number)
      return existing
    }
    
    // Insert new certificate
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .insert({
        student_id: student.id,
        course_id: course.id,
        certificate_number: certNumber,
        student_name: student.name,
        class_level: student.class_level,
        program_name: course.name,
        issued_date: new Date().toISOString()
      })
      .select()
      .single()
    
    if (certError) {
      console.error('Certificate creation error:', certError)
      throw new Error('Failed to create certificate: ' + certError.message)
    }
    
    console.log('✅ Certificate created:', cert)
    return cert
  } catch (error) {
    console.error('createCertificate error:', error)
    throw error
  }
}

// ============================================================
// EMAIL LOGS
// ============================================================
export async function logEmail(studentId, emailType, recipientEmail, subject, status, errorMessage = null) {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert({
        student_id: studentId,
        email_type: emailType,
        recipient_email: recipientEmail,
        subject,
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString()
      })
    if (error) console.error('Failed to log email:', error.message)
  } catch (error) {
    console.error('logEmail error:', error)
  }
}

export async function getAllEmailLogs() {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllEmailLogs error:', error)
    return []
  }
}

// ============================================================
// PLATFORM SETTINGS
// ============================================================
export async function getPlatformSettings() {
  try {
    const { data, error } = await supabase.from('platform_settings').select('*')
    if (error) throw new Error(error.message)
    const settings = {}
    ;(data || []).forEach(s => { settings[s.key] = s.value })
    return settings
  } catch (error) {
    console.error('getPlatformSettings error:', error)
    return {}
  }
}

export async function updatePlatformSetting(key, value) {
  try {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error('updatePlatformSetting error:', error)
    throw error
  }
}

// ============================================================
// SUBJECTS
// ============================================================
export async function getAllSubjects() {
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('sort_order')
    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('getAllSubjects error:', error)
    return []
  }
}

// ============================================================
// ADMIN CRUD (generic helpers for admin panel)
// ============================================================
export async function adminInsert(table, row) {
  try {
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error(`adminInsert error on ${table}:`, error)
    throw error
  }
}

export async function adminUpdate(table, id, updates) {
  try {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error(`adminUpdate error on ${table}:`, error)
    throw error
  }
}

export async function adminDelete(table, id) {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
  } catch (error) {
    console.error(`adminDelete error on ${table}:`, error)
    throw error
  }
}

// ============================================================
// EMAIL SENDING (disabled to prevent rate limit)
// =====// src/data.js - Replace these functions to enable emails

export async function sendBadgeEmail(student, badge, chapter) {
  try {
    console.log(`📧 Sending badge email to ${student.email}: ${badge.name}`);
    
    // Try to send email via Supabase Edge Function
    const response = await fetch(`${FUNCTIONS_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'badge',
        to: student.email,
        studentName: student.name,
        badgeName: badge.name,
        chapterTitle: chapter.title
      })
    });
    
    const result = await response.json();
    
    // Log the email
    await logEmail(
      student.id, 
      'badge', 
      student.email, 
      `🎉 You earned the ${badge.name} badge!`, 
      result.success ? 'sent' : 'failed',
      result.error
    );
    
    return result;
  } catch (err) {
    console.error('sendBadgeEmail error:', err);
    await logEmail(
      student.id, 
      'badge', 
      student.email, 
      `🎉 You earned the ${badge.name} badge!`, 
      'failed', 
      err.message
    );
    return { success: false, error: err.message };
  }
}

export async function sendCertificateEmail(student, certificate) {
  try {
    console.log(`📧 Sending certificate email to ${student.email}: ${certificate.certificate_number}`);
    
    const response = await fetch(`${FUNCTIONS_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'certificate',
        to: student.email,
        studentName: student.name,
        certificateNumber: certificate.certificate_number,
        programName: certificate.program_name
      })
    });
    
    const result = await response.json();
    
    await logEmail(
      student.id, 
      'certificate', 
      student.email, 
      `📜 Your Certificate is Ready!`, 
      result.success ? 'sent' : 'failed',
      result.error
    );
    
    return result;
  } catch (err) {
    console.error('sendCertificateEmail error:', err);
    await logEmail(
      student.id, 
      'certificate', 
      student.email, 
      `📜 Your Certificate is Ready!`, 
      'failed', 
      err.message
    );
    return { success: false, error: err.message };
  }
}