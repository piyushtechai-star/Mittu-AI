import type { Category } from '@/api/mittu';

// Storyboard colours: Love red, Career blue, Paisa gold, Health green, General purple.
export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'love', label: 'Love ❤️', color: '#C93A3A' },
  { value: 'career', label: 'Career 💼', color: '#1F6DB0' },
  { value: 'paisa', label: 'Paisa 💰', color: '#A87B22' },
  { value: 'health', label: 'Health 🌿', color: '#23874B' },
  { value: 'general', label: 'General ✨', color: '#7442BE' },
];

