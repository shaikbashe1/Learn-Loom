// Shared validation utility for AI-generated course/roadmap JSON

export interface RoadmapPhase {
  phase: number;
  title: string;
  duration_weeks: number;
  topics: string[];
  assignments: string[];
  key_skills?: string[];
  estimated_hours?: number;
  prerequisite_knowledge?: string[];
}

export interface RoadmapOutput {
  title: string;
  description: string;
  estimated_weeks: number;
  phases: RoadmapPhase[];
}

export interface ValidationResult {
  valid: boolean;
  data: RoadmapOutput;
  errors: string[];
}

/**
 * Validates and sanitizes AI-generated roadmap JSON.
 * Returns a validated object or falls back to a default structure.
 */
export function validateRoadmapOutput(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      data: getDefaultRoadmap(),
      errors: ['Response is not a valid JSON object'],
    };
  }

  const obj = raw as Record<string, unknown>;

  // Validate top-level fields
  const title = typeof obj.title === 'string' && obj.title.trim().length > 0
    ? obj.title.trim().slice(0, 200)
    : (() => { errors.push('Missing or invalid title'); return 'Learning Roadmap'; })();

  const description = typeof obj.description === 'string' && obj.description.trim().length > 0
    ? obj.description.trim().slice(0, 500)
    : (() => { errors.push('Missing or invalid description'); return 'A personalized learning roadmap.'; })();

  let estimatedWeeks = typeof obj.estimated_weeks === 'number' ? obj.estimated_weeks : 12;
  if (estimatedWeeks < 1 || estimatedWeeks > 52) {
    errors.push(`estimated_weeks out of range (${estimatedWeeks}), clamped`);
    estimatedWeeks = Math.max(1, Math.min(52, estimatedWeeks));
  }

  // Validate phases
  if (!Array.isArray(obj.phases) || obj.phases.length === 0) {
    return {
      valid: false,
      data: getDefaultRoadmap(),
      errors: ['Missing or empty phases array'],
    };
  }

  if (obj.phases.length > 10) {
    errors.push(`Too many phases (${obj.phases.length}), truncated to 10`);
  }

  const phases: RoadmapPhase[] = obj.phases.slice(0, 10).map((p: unknown, idx: number) => {
    const phase = p as Record<string, unknown>;
    return {
      phase: typeof phase.phase === 'number' ? phase.phase : idx + 1,
      title: typeof phase.title === 'string' && phase.title.trim()
        ? phase.title.trim().slice(0, 150)
        : `Phase ${idx + 1}`,
      duration_weeks: typeof phase.duration_weeks === 'number'
        ? Math.max(1, Math.min(12, phase.duration_weeks))
        : 2,
      topics: Array.isArray(phase.topics) && phase.topics.length > 0
        ? phase.topics.filter((t: unknown) => typeof t === 'string' && t.trim()).slice(0, 15)
        : ['General concepts'],
      assignments: Array.isArray(phase.assignments)
        ? phase.assignments.filter((a: unknown) => typeof a === 'string' && a.trim()).slice(0, 10)
        : [],
      key_skills: Array.isArray(phase.key_skills)
        ? phase.key_skills.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 10)
        : undefined,
      estimated_hours: typeof phase.estimated_hours === 'number'
        ? Math.max(1, Math.min(200, phase.estimated_hours))
        : undefined,
      prerequisite_knowledge: Array.isArray(phase.prerequisite_knowledge)
        ? phase.prerequisite_knowledge.filter((p: unknown) => typeof p === 'string' && p.trim()).slice(0, 5)
        : undefined,
    };
  });

  return {
    valid: errors.length === 0,
    data: { title, description, estimated_weeks: estimatedWeeks, phases },
    errors,
  };
}

function getDefaultRoadmap(): RoadmapOutput {
  return {
    title: 'Learning Roadmap',
    description: 'A structured learning path to build your skills.',
    estimated_weeks: 12,
    phases: [
      {
        phase: 1,
        title: 'Foundations',
        duration_weeks: 3,
        topics: ['Core concepts', 'Basic syntax', 'Setup & tooling'],
        assignments: ['Set up your development environment', 'Build a Hello World project'],
      },
      {
        phase: 2,
        title: 'Intermediate Concepts',
        duration_weeks: 4,
        topics: ['Data structures', 'Algorithms', 'Design patterns'],
        assignments: ['Implement a data structure from scratch', 'Solve 10 practice problems'],
      },
      {
        phase: 3,
        title: 'Advanced Topics',
        duration_weeks: 3,
        topics: ['System design', 'Performance optimization', 'Testing'],
        assignments: ['Design a scalable system', 'Write comprehensive tests'],
      },
      {
        phase: 4,
        title: 'Capstone Project',
        duration_weeks: 2,
        topics: ['Project planning', 'Full-stack development', 'Deployment'],
        assignments: ['Build and deploy a complete project', 'Present your work'],
      },
    ],
  };
}
