/** Demo content seeded once when a new user has an empty workspace. Active only — no completed. */

export const DEMO_CATEGORIES = [
  { key: 'work', name: 'Work', color: '#3b82f6', icon: 'Briefcase' },
  { key: 'home', name: 'Home', color: '#14b8a6', icon: 'Home' },
  { key: 'shopping', name: 'Shopping', color: '#f97316', icon: 'ShoppingCart' },
  { key: 'personal', name: 'Personal', color: '#ec4899', icon: 'Heart' },
] as const;

export const DEMO_TAGS = [
  { key: 'urgent', name: 'urgent', color: '#ef4444' },
  { key: 'later', name: 'later', color: '#64748b' },
  { key: 'errands', name: 'errands', color: '#f97316' },
] as const;

type CategoryKey = (typeof DEMO_CATEGORIES)[number]['key'];
type TagKey = (typeof DEMO_TAGS)[number]['key'];

export type DemoTaskSeed = {
  title: string;
  description: string;
  categoryKey: CategoryKey | null;
  tagKeys: TagKey[];
  /** Days from today at noon; null = no date */
  scheduledOffsetDays: number | null;
  sortOrder: number;
};

export const DEMO_TASKS: DemoTaskSeed[] = [
  {
    title: 'Answer emails',
    description: '',
    categoryKey: 'work',
    tagKeys: ['urgent'],
    scheduledOffsetDays: null,
    sortOrder: 0,
  },
  {
    title: 'Finish weekly report',
    description: 'Send before Friday.',
    categoryKey: 'work',
    tagKeys: [],
    scheduledOffsetDays: null,
    sortOrder: 1,
  },
  {
    title: 'Buy groceries',
    description: 'Milk, bread, eggs, fruit.',
    categoryKey: 'shopping',
    tagKeys: ['errands'],
    scheduledOffsetDays: null,
    sortOrder: 2,
  },
  {
    title: 'Clean the kitchen',
    description: '',
    categoryKey: 'home',
    tagKeys: ['later'],
    scheduledOffsetDays: null,
    sortOrder: 3,
  },
  {
    title: 'Call the dentist',
    description: 'Book a checkup.',
    categoryKey: 'personal',
    tagKeys: [],
    scheduledOffsetDays: null,
    sortOrder: 4,
  },
  {
    title: 'Pay the bills',
    description: '',
    categoryKey: 'home',
    tagKeys: ['urgent'],
    scheduledOffsetDays: null,
    sortOrder: 5,
  },
];

export function scheduledAtNoon(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}
