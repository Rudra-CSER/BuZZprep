/** Job applications. */

export const APPLICATION_STAGES = [
  'interested',
  'preparing',
  'applied',
  'referral_requested',
  'assessment',
  'technical_interview',
  'hr_interview',
  'rejected',
  'offer',
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export const APPLICATION_STAGE_LABEL: Record<ApplicationStage, string> = {
  interested: 'Interested',
  preparing: 'Preparing',
  applied: 'Applied',
  referral_requested: 'Referral requested',
  assessment: 'Assessment',
  technical_interview: 'Technical interview',
  hr_interview: 'HR interview',
  rejected: 'Rejected',
  offer: 'Offer received',
};
