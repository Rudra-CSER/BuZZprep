import type { OnboardingAnswersInput } from '@buzzprep/shared';

export type Answers = OnboardingAnswersInput;
export type Update = (patch: Partial<Answers>) => void;
