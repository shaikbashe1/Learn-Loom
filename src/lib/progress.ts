/**
 * Course Progression Helpers
 * All enrollment and module progress operations go through Firebase.
 */
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, limit } from 'firebase/firestore';
import type {
  DBEnrollment, DBModuleProgress, ModuleWithStatus,
  EnrollmentWithCourse, ModuleStatus,
} from '@/types/types';

// ── Enrollment ────────────────────────────────────────────────────────────────

/** Get the enrollment record for a specific user + course. Returns null if not enrolled. */
export async function getEnrollment(
  userId: string,
  courseId: string,
): Promise<DBEnrollment | null> {
  const q = query(
    collection(db, 'user_course_enrollments'),
    where('user_id', '==', userId),
    where('course_id', '==', courseId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as DBEnrollment;
}

/** Enroll a user in a course. Sets progress to 0 and unlocks the first module. */
export async function enrollInCourse(
  userId: string,
  courseId: string,
): Promise<{ error: string | null }> {
  try {
    // 1. Upsert enrollment row
    const enrollQ = query(
      collection(db, 'user_course_enrollments'),
      where('user_id', '==', userId),
      where('course_id', '==', courseId),
      limit(1)
    );
    const enrollSnap = await getDocs(enrollQ);
    if (enrollSnap.empty) {
      await addDoc(collection(db, 'user_course_enrollments'), {
        user_id: userId,
        course_id: courseId,
        progress_percent: 0,
        enrolled_at: new Date().toISOString()
      });
    } else {
      await updateDoc(doc(db, 'user_course_enrollments', enrollSnap.docs[0].id), {
        progress_percent: 0
      });
    }

    // 2. Fetch all modules for this course ordered by order_index
    const modQ = query(
      collection(db, 'course_modules'),
      where('course_id', '==', courseId)
    );
    const modSnap = await getDocs(modQ);
    let modules = modSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    modules.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    if (modules.length === 0) return { error: null };

    // 3. Insert module progress rows — first module unlocked, rest locked
    for (let idx = 0; idx < modules.length; idx++) {
      const m = modules[idx];
      const progQ = query(
        collection(db, 'user_module_progress'),
        where('user_id', '==', userId),
        where('module_id', '==', m.id),
        limit(1)
      );
      const progSnap = await getDocs(progQ);
      const status = (idx === 0 ? 'unlocked' : 'locked') as ModuleStatus;
      if (progSnap.empty) {
        await addDoc(collection(db, 'user_module_progress'), {
          user_id: userId,
          module_id: m.id,
          course_id: courseId,
          status
        });
      } else {
        await updateDoc(doc(db, 'user_module_progress', progSnap.docs[0].id), {
          status
        });
      }
    }

    // 4. Set last_module_id to the first module
    const enrollSnap2 = await getDocs(enrollQ);
    if (!enrollSnap2.empty) {
      await updateDoc(doc(db, 'user_course_enrollments', enrollSnap2.docs[0].id), {
        last_module_id: modules[0].id
      });
    } else {
      // In case it was just added and we need to fetch it again or query it again
      const newEnrollQ = query(
        collection(db, 'user_course_enrollments'),
        where('user_id', '==', userId),
        where('course_id', '==', courseId),
        limit(1)
      );
      const newEnrollSnap = await getDocs(newEnrollQ);
      if (!newEnrollSnap.empty) {
        await updateDoc(doc(db, 'user_course_enrollments', newEnrollSnap.docs[0].id), {
          last_module_id: modules[0].id
        });
      }
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── Module Progress ───────────────────────────────────────────────────────────

/** Get progress status for all modules of a course for a given user. */
export async function getCourseModuleProgress(
  userId: string,
  courseId: string,
): Promise<DBModuleProgress[]> {
  const q = query(
    collection(db, 'user_module_progress'),
    where('user_id', '==', userId),
    where('course_id', '==', courseId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DBModuleProgress));
}

/**
 * Mark a module as completed. Automatically:
 * 1. Sets the current module status → completed
 * 2. Unlocks the next sequential module (if any)
 * 3. Recalculates and updates progress_percent
 * 4. Sets completed_at on enrollment if all modules done
 * 5. Updates last_module_id to next module (or keeps current if last)
 */
export async function completeModule(
  userId: string,
  courseId: string,
  moduleId: string,
): Promise<{ error: string | null; isCourseDone: boolean }> {
  try {
    // 1. Mark current module completed
    const currModQ = query(
      collection(db, 'user_module_progress'),
      where('user_id', '==', userId),
      where('module_id', '==', moduleId),
      limit(1)
    );
    const currModSnap = await getDocs(currModQ);
    if (!currModSnap.empty) {
      await updateDoc(doc(db, 'user_module_progress', currModSnap.docs[0].id), {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    } else {
      return { error: 'Progress record not found', isCourseDone: false };
    }

    // 2. Fetch all modules sorted by order_index
    const allModQ = query(
      collection(db, 'course_modules'),
      where('course_id', '==', courseId)
    );
    const allModSnap = await getDocs(allModQ);
    let allModules = allModSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    allModules.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    if (allModules.length === 0) return { error: 'No modules', isCourseDone: false };

    const currentIndex = allModules.findIndex(m => m.id === moduleId);
    const nextModule = allModules[currentIndex + 1] ?? null;

    // 3. Unlock next module
    if (nextModule) {
      const nextModQ = query(
        collection(db, 'user_module_progress'),
        where('user_id', '==', userId),
        where('module_id', '==', nextModule.id),
        limit(1)
      );
      const nextModSnap = await getDocs(nextModQ);
      if (!nextModSnap.empty) {
        await updateDoc(doc(db, 'user_module_progress', nextModSnap.docs[0].id), {
          status: 'unlocked'
        });
      }
    }

    // 4. Recalculate progress percent
    const progRowsQ = query(
      collection(db, 'user_module_progress'),
      where('user_id', '==', userId),
      where('course_id', '==', courseId)
    );
    const progRowsSnap = await getDocs(progRowsQ);
    const progRows = progRowsSnap.docs.map(d => d.data() as DBModuleProgress);

    const total = allModules.length;
    const completed = progRows.filter(r => r.status === 'completed').length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isCourseDone = progressPercent === 100;

    // 5. Update enrollment (completed_at is NOT set here; only after assessments are passed)
    const enrollQ = query(
      collection(db, 'user_course_enrollments'),
      where('user_id', '==', userId),
      where('course_id', '==', courseId),
      limit(1)
    );
    const enrollSnap = await getDocs(enrollQ);
    if (!enrollSnap.empty) {
      await updateDoc(doc(db, 'user_course_enrollments', enrollSnap.docs[0].id), {
        progress_percent: progressPercent,
        last_module_id: nextModule ? nextModule.id : moduleId
      });
    }

    // 6. Log activity for streak tracking (fire-and-forget)
    addDoc(collection(db, 'activity_logs'), {
      user_id: userId,
      type: 'lesson',
      value: 1,
      created_at: new Date().toISOString()
    }).catch(() => {});

    return { error: null, isCourseDone };
  } catch (err: any) {
    return { error: err.message, isCourseDone: false };
  }
}

/**
 * Checks if a user has passed both MCQ and Coding final assessments.
 * If so, automatically awards them a certificate for the course and updates completed_at.
 */
export async function checkAndAwardCertificate(userId: string, courseId: string) {
  try {
    // 1. Get passing attempts for this user and course
    const attemptsQ = query(
      collection(db, 'assessment_attempts'),
      where('user_id', '==', userId),
      where('course_id', '==', courseId),
      where('is_passed', '==', true)
    );
    const attemptsSnap = await getDocs(attemptsQ);
    const attempts = attemptsSnap.docs.map(d => d.data() as any);

    if (attempts.length === 0) return;

    const hasMCQ = attempts.find(a => a.metrics?.type === 'mcq');
    const hasCoding = attempts.find(a => a.metrics?.type === 'coding');

    // 2. Check if course actually has coding questions
    const codingQ = query(
      collection(db, 'coding_questions'),
      where('course_id', '==', courseId)
    );
    const codingSnap = await getDocs(codingQ);
    const requiresCoding = !codingSnap.empty;

    // 3. Validate condition: must have passed MCQ, and if coding is required, must have passed Coding
    if (hasMCQ && (!requiresCoding || hasCoding)) {
      // Average score calculation
      let avgScore = hasMCQ.score_percentage;
      if (requiresCoding && hasCoding) {
        avgScore = Math.round((hasMCQ.score_percentage + hasCoding.score_percentage) / 2);
      }

      // Check if certificate already exists
      const certQ = query(
        collection(db, 'certificates'),
        where('user_id', '==', userId),
        where('course_id', '==', courseId),
        limit(1)
      );
      const certSnap = await getDocs(certQ);

      if (certSnap.empty) {
        // Create the certificate
        await addDoc(collection(db, 'certificates'), {
          user_id: userId,
          course_id: courseId,
          score: avgScore,
          verification_code: Math.random().toString(36).substring(2, 11).toUpperCase(),
          is_valid: true,
          issued_at: new Date().toISOString()
        });

        // 4. Mark course enrollment as completed since validation passed!
        const enrollQ = query(
          collection(db, 'user_course_enrollments'),
          where('user_id', '==', userId),
          where('course_id', '==', courseId),
          limit(1)
        );
        const enrollSnap = await getDocs(enrollQ);
        if (!enrollSnap.empty) {
          await updateDoc(doc(db, 'user_course_enrollments', enrollSnap.docs[0].id), {
            completed_at: new Date().toISOString()
          });
        }
          
        // 5. Automated Activity Post for Community Feed
        let courseTitle = '';
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          courseTitle = courseDoc.data().title;
        } else {
          const courseQ = query(collection(db, 'courses'), where('id', '==', courseId), limit(1));
          const courseSnap = await getDocs(courseQ);
          if (!courseSnap.empty) courseTitle = courseSnap.docs[0].data().title;
        }

        if (courseTitle) {
          const title = `🏆 Just earned my certificate in ${courseTitle}!`;
          const content = `I'm thrilled to announce that I've successfully completed the **${courseTitle}** course on Quovexi and earned my certificate with a score of ${avgScore}%! 🚀\n\nThis was an incredible journey. Onwards to the next challenge!`;
          
          await addDoc(collection(db, 'forum_posts'), {
            course_id: courseId,
            module_id: null,
            user_id: userId,
            title,
            content,
            upvotes: 0,
            is_pinned: false,
            created_at: new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.error("Error in checkAndAwardCertificate:", err);
  }
}

// ── Dashboard helpers ─────────────────────────────────────────────────────────

/** Get all enrollments for a user with joined course data. */
export async function getUserEnrollments(
  userId: string,
): Promise<EnrollmentWithCourse[]> {
  try {
    const q = query(
      collection(db, 'user_course_enrollments'),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    const enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    // Sort by enrolled_at descending
    enrollments.sort((a, b) => new Date(b.enrolled_at || 0).getTime() - new Date(a.enrolled_at || 0).getTime());

    const results: EnrollmentWithCourse[] = [];
    
    for (const enr of enrollments) {
      let course = null;
      let last_module = null;

      if (enr.course_id) {
        let cDoc = await getDoc(doc(db, 'courses', enr.course_id));
        if (cDoc.exists()) {
          course = { id: cDoc.id, ...cDoc.data() };
        } else {
          const cQ = query(collection(db, 'courses'), where('id', '==', enr.course_id), limit(1));
          const cSnap = await getDocs(cQ);
          if (!cSnap.empty) course = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
        }
      }

      if (enr.last_module_id) {
        let mDoc = await getDoc(doc(db, 'course_modules', enr.last_module_id));
        if (mDoc.exists()) {
          last_module = { id: mDoc.id, ...mDoc.data() };
        } else {
          const mQ = query(collection(db, 'course_modules'), where('id', '==', enr.last_module_id), limit(1));
          const mSnap = await getDocs(mQ);
          if (!mSnap.empty) last_module = { id: mSnap.docs[0].id, ...mSnap.docs[0].data() };
        }
      }

      results.push({
        ...enr,
        course,
        last_module
      } as EnrollmentWithCourse);
    }
    
    return results;
  } catch (err) {
    console.error("Error in getUserEnrollments:", err);
    return [];
  }
}
