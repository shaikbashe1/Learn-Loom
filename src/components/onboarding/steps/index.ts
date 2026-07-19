import type { StepDef } from '../types';
import { BIO_LIMIT, isValidMobile, isPincodeValid } from '../validation';
import WelcomeStep from './WelcomeStep';
import ProfileStep from './ProfileStep';
import EducationStep from './EducationStep';
import PersonalStep from './PersonalStep';
import BioStep from './BioStep';
import CareerStep from './CareerStep';
import SkillsStep from './SkillsStep';
import LearningGoalStep from './LearningGoalStep';
import DailyTimeStep from './DailyTimeStep';
import ReviewStep from './ReviewStep';

/**
 * The wizard step registry — the single source of truth for order, copy,
 * validation and rendering. To add a future section (projects, certifications,
 * GitHub, portfolio, …): create a Step component and insert one entry here.
 * The shell, progress bar, autosave and resume logic all adapt automatically.
 */
export const STEPS: StepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to Quovexi 🎓',
    subtitle: "Let's personalize your learning experience in less than 2 minutes.",
    Component: WelcomeStep,
    isValid: () => true,
  },
  {
    id: 'profile',
    title: 'Set up your profile',
    subtitle: 'This is how other learners will see you.',
    Component: ProfileStep,
    isValid: ({ form, username }) => form.full_name.trim().length >= 2 && username.status === 'available',
  },
  {
    id: 'education',
    title: 'Tell us what you do',
    subtitle: 'We use this to recommend the right content.',
    Component: EducationStep,
    isValid: ({ form, isStudent }) => form.user_type !== '' && (!isStudent || form.college_name.trim() !== ''),
  },
  {
    id: 'personal',
    title: 'A few personal details',
    subtitle: 'All optional — it helps with local opportunities.',
    Component: PersonalStep,
    isValid: ({ form }) => isValidMobile(form.mobile_number) && isPincodeValid(form.pincode),
  },
  {
    id: 'bio',
    title: 'Write a short bio',
    subtitle: 'A line or two about your interests and goals.',
    Component: BioStep,
    isValid: ({ form }) => form.bio.length <= BIO_LIMIT,
  },
  {
    id: 'career',
    title: 'Your career goals',
    subtitle: 'Where do you want this journey to take you?',
    Component: CareerStep,
    isValid: ({ form }) => form.dream_roles.length > 0,
  },
  {
    id: 'skills',
    title: 'Skills & interests',
    subtitle: 'Pick what you know or want to learn.',
    Component: SkillsStep,
    isValid: ({ form }) => form.interests.length > 0,
  },
  {
    id: 'learning_goal',
    title: 'Your main learning goal',
    subtitle: 'What matters most to you right now?',
    Component: LearningGoalStep,
    isValid: ({ form }) => form.learning_goal !== '',
  },
  {
    id: 'daily_time',
    title: 'Daily learning goal',
    subtitle: 'How much time can you invest each day?',
    Component: DailyTimeStep,
    isValid: ({ form }) => form.daily_learning_time !== '',
  },
  {
    id: 'review',
    title: 'All set!',
    subtitle: 'Review your profile and jump in.',
    Component: ReviewStep,
    isValid: () => true,
  },
];
