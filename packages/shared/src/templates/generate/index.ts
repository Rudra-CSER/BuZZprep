/**
 * The plan generator: setup answers in, a complete configuration bundle out.
 *
 *   createContext ─▶ buildRoutine (sleep → work → study → weekend → gym) ─▶ addReminders
 *                 └▶ milestones, habits, notification preferences, career
 */
export { generateBundle, type GenerateOptions } from './generate-bundle';
export { pickSpread } from './context';
export { summarizeWeek, type WeekSummary } from './summary';
export { defaultAnswers } from './defaults';
