import { supabase } from '@/db/supabase';
import { staticRoadmaps } from '@/data/roadmaps';
import { v4 as uuidv4 } from 'uuid';

export async function generateAndSaveRoadmap(
  userId: string,
  domain: string,
  targetRole: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
) {
  // 1. Fetch template
  const template = staticRoadmaps[domain] || staticRoadmaps['web-development'];
  
  const roadmapId = uuidv4();
  
  let multiplier = 1;
  if (difficulty === 'intermediate') multiplier = 0.8;
  if (difficulty === 'advanced') multiplier = 0.5;

  const totalWeeks = Math.max(4, Math.round(template.estimated_weeks * multiplier));

  // 2. Insert Roadmap
  const { error: rError } = await supabase.from('user_roadmaps').insert({
    id: roadmapId,
    user_id: userId,
    title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${template.title}`,
    description: `A personalized ${difficulty} roadmap to become a ${targetRole}. ${template.description}`,
    domain: domain,
    target_role: targetRole,
    difficulty: difficulty,
    estimated_weeks: totalWeeks,
    progress_percentage: 0
  });

  if (rError) throw rError;

  // 3. Prepare Stages & Items
  for (let i = 0; i < template.phases.length; i++) {
    const phase = template.phases[i];
    const stageId = uuidv4();

    await supabase.from('roadmap_stages').insert({
      id: stageId,
      roadmap_id: roadmapId,
      title: phase.title,
      description: `Mastering ${phase.topics.slice(0, 3).join(', ')}...`,
      phase_number: phase.phase,
      status: i === 0 ? 'in_progress' : 'locked',
      xp_reward: phase.duration_weeks * 50,
      order_index: i
    });

    const items = [];
    
    // Convert topics into items
    phase.topics.forEach((topic, idx) => {
      items.push({
        id: uuidv4(),
        stage_id: stageId,
        title: `Learn ${topic}`,
        item_type: 'course',
        resource_url: null,
        status: 'pending',
        duration_minutes: 60
      });
    });

    // Convert assignments
    phase.assignments.forEach((asg, idx) => {
      items.push({
        id: uuidv4(),
        stage_id: stageId,
        title: `Assignment: ${asg}`,
        item_type: 'project',
        resource_url: null,
        status: 'pending',
        duration_minutes: 120
      });
    });

    if (items.length > 0) {
      await supabase.from('roadmap_items').insert(items);
    }
  }

  return roadmapId;
}
