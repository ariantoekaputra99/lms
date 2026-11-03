import { FileQuestion, FileText, FileUp, PlayCircle, ScrollText } from 'lucide-react';
import type { LessonType } from '../types/api';

const icons = { VIDEO: PlayCircle, TEXT: ScrollText, PDF: FileText, QUIZ: FileQuestion, ASSIGNMENT: FileUp };

export function LessonIcon({ type, size = 16, className }: { type: LessonType; size?: number; className?: string }) {
  const Icon = icons[type];
  return <Icon size={size} className={className} aria-hidden />;
}
