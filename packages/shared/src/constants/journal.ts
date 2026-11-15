/** Journal entry types, guided prompts and moods. */

export const JOURNAL_TYPES = ['morning', 'evening', 'weekly', 'freeform'] as const;
export type JournalType = (typeof JOURNAL_TYPES)[number];

export interface JournalPrompt {
  key: string;
  question: string;
}

export const JOURNAL_PROMPTS: Record<Exclude<JournalType, 'freeform'>, JournalPrompt[]> = {
  morning: [
    { key: 'top3', question: 'What are today’s three most important tasks?' },
    { key: 'achieve', question: 'What do I want to achieve today?' },
    { key: 'energy', question: 'How is my current energy level?' },
    { key: 'distractions', question: 'Is there anything distracting me?' },
  ],
  evening: [
    { key: 'accomplished', question: 'What did I accomplish today?' },
    { key: 'incomplete', question: 'What did I fail to complete?' },
    { key: 'why_missed', question: 'Why did I miss those tasks?' },
    { key: 'learned', question: 'What did I learn?' },
    { key: 'improve', question: 'What could I improve tomorrow?' },
  ],
  weekly: [
    { key: 'sessions', question: 'How many study sessions did I complete?' },
    { key: 'dsa_independent', question: 'How many DSA problems did I independently solve?' },
    { key: 'sd_concepts', question: 'What System Design concepts did I learn?' },
    { key: 'balance', question: 'How was my work-life balance?' },
    { key: 'exercise', question: 'Did I exercise?' },
    { key: 'interruptions', question: 'What caused interruptions?' },
    { key: 'change', question: 'What should change next week?' },
  ],
};

export const MOODS = ['great', 'good', 'okay', 'low', 'rough'] as const;
export type Mood = (typeof MOODS)[number];
