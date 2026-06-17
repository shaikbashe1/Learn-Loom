/**
 * Course Progression Helpers
 * All enrollment and module progress operations go through Supabase.
 */
import { supabase } from '@/db/supabase';
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
  const { data } = await supabase
    .from('user_course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  return data;
}

/** Enroll a user in a course. Sets progress to 0 and unlocks the first module. */
export async function enrollInCourse(
  userId: string,
  courseId: string,
): Promise<{ error: string | null }> {
  // 1. Upsert enrollment row
  const { error: enrollErr } = await supabase
    .from('user_course_enrollments')
    .upsert({ user_id: userId, course_id: courseId, progress_percent: 0 });
  if (enrollErr) return { error: enrollErr.message };

  // 2. Fetch all modules for this course ordered by order_index
  const { data: modules, error: modErr } = await supabase
    .from('course_modules')
    .select('id, order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (modErr) return { error: modErr.message };
  if (!modules || modules.length === 0) return { error: null };

  // 3. Insert module progress rows — first module unlocked, rest locked
  const rows = modules.map((m, idx) => ({
    user_id: userId,
    module_id: m.id,
    course_id: courseId,
    status: (idx === 0 ? 'unlocked' : 'locked') as ModuleStatus,
  }));

  const { error: progressErr } = await supabase
    .from('user_module_progress')
    .upsert(rows, { onConflict: 'user_id,module_id' });
  if (progressErr) return { error: progressErr.message };

  // 4. Set last_module_id to the first module
  await supabase
    .from('user_course_enrollments')
    .update({ last_module_id: modules[0].id })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  return { error: null };
}

// ── Module Progress ───────────────────────────────────────────────────────────

/** Get progress status for all modules of a course for a given user. */
export async function getCourseModuleProgress(
  userId: string,
  courseId: string,
): Promise<DBModuleProgress[]> {
  const { data } = await supabase
    .from('user_module_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  return data ?? [];
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
  // 1. Mark current module completed
  const { error: completeErr } = await supabase
    .from('user_module_progress')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('module_id', moduleId);
  if (completeErr) return { error: completeErr.message, isCourseDone: false };

  // 2. Fetch all modules sorted by order_index
  const { data: allModules, error: modErr } = await supabase
    .from('course_modules')
    .select('id, order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (modErr || !allModules) return { error: modErr?.message ?? 'No modules', isCourseDone: false };

  const currentIndex = allModules.findIndex(m => m.id === moduleId);
  const nextModule = allModules[currentIndex + 1] ?? null;

  // 3. Unlock next module
  if (nextModule) {
    await supabase
      .from('user_module_progress')
      .update({ status: 'unlocked' })
      .eq('user_id', userId)
      .eq('module_id', nextModule.id);
  }

  // 4. Recalculate progress percent
  const { data: progRows } = await supabase
    .from('user_module_progress')
    .select('status')
    .eq('user_id', userId)
    .eq('course_id', courseId);

  const total = allModules.length;
  const completed = (progRows ?? []).filter(r => r.status === 'completed').length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isCourseDone = progressPercent === 100;

  // 5. Update enrollment
  await supabase
    .from('user_course_enrollments')
    .update({
      progress_percent: progressPercent,
      last_module_id: nextModule ? nextModule.id : moduleId,
      ...(isCourseDone ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  // 6. Log activity for streak tracking (fire-and-forget)
  void supabase.rpc('log_activity', { p_user_id: userId, p_type: 'lesson', p_value: 1 }).then(() => {});

  // 7. Auto-award certificate if course is newly completed
  if (isCourseDone) {
    await supabase.from('certificates').insert({
      user_id: userId,
      course_id: courseId,
      score: 100,
      verification_code: ''
    });
  }

  return { error: null, isCourseDone };
}

// ── Dashboard helpers ─────────────────────────────────────────────────────────

/** Get all enrollments for a user with joined course data. */
export async function getUserEnrollments(
  userId: string,
): Promise<EnrollmentWithCourse[]> {
  const { data } = await supabase
    .from('user_course_enrollments')
    .select(`
      *,
      course:courses(*),
      last_module:course_modules!user_course_enrollments_last_module_id_fkey(*)
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
  return (data as EnrollmentWithCourse[]) ?? [];
}


