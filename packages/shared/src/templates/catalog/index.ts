import type { TemplateKey } from '../../schemas/onboarding';
import { sdeInterview } from './sde-interview';
import { frontendInterview } from './frontend-interview';
import { backendInterview } from './backend-interview';
import { gate } from './gate';
import { competitiveProgramming } from './competitive-programming';
import { newSkill } from './new-skill';
import { careerTransition } from './career-transition';
import { blank } from './blank';
import type { PlanTemplate } from './types';

/**
 * Built-in plan templates. They contain NO personal data — only generic tracks, topics,
 * milestones and habits. Personal details live in a user's profile (or a local, gitignored
 * config bundle), never in source.
 */
export type { MilestoneTemplate, PlanTemplate } from './types';

/** In the order the setup wizard lists them. */
export const TEMPLATES: PlanTemplate[] = [
  sdeInterview,
  frontendInterview,
  backendInterview,
  gate,
  competitiveProgramming,
  newSkill,
  careerTransition,
  blank,
];

export function getTemplate(key: TemplateKey): PlanTemplate {
  const template = TEMPLATES.find((t) => t.key === key);
  if (!template) throw new Error(`Unknown template "${key}"`);
  return template;
}
