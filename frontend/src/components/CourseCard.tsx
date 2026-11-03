import { Link } from 'react-router-dom';
import { BookOpen, Clock, Users } from 'lucide-react';
import { assetUrl } from '../services/api';
import { duration, levelLabel, num, price } from '../lib/format';
import type { CourseSummary } from '../types/api';
import { Badge } from './ui';

export function Thumbnail({ course, className }: { course: CourseSummary; className?: string }) {
  const src = assetUrl(course.thumbnailUrl);
  return src
    ? <img src={src} alt="" loading="lazy" className={`aspect-video w-full object-cover ${className ?? ''}`} />
    : (
      <div className={`flex aspect-video w-full items-center justify-center bg-gradient-to-br from-brand-500 to-violet-600 p-4 ${className ?? ''}`}>
        <span className="line-clamp-3 text-center text-lg font-bold text-white/95">{course.title}</span>
      </div>
    );
}

export function CourseCard({ course, to }: { course: CourseSummary; to?: string }) {
  return (
    <Link to={to ?? `/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Thumbnail course={course} className="transition group-hover:opacity-95" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-1.5">
          {course.categoryName && <Badge tone="brand">{course.categoryName}</Badge>}
          <Badge>{levelLabel[course.level]}</Badge>
        </div>
        <h3 className="mt-2 line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700">{course.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{course.instructorName}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><BookOpen size={13} /> {course.lessonCount} materi</span>
          {course.totalMinutes > 0 && <span className="inline-flex items-center gap-1"><Clock size={13} /> {duration(course.totalMinutes)}</span>}
          <span className="inline-flex items-center gap-1"><Users size={13} /> {num(course.studentCount)} siswa</span>
        </div>
        <p className={`mt-auto pt-3 text-lg font-bold ${course.free ? 'text-emerald-600' : 'text-slate-900'}`}>{price(course.price)}</p>
      </div>
    </Link>
  );
}
