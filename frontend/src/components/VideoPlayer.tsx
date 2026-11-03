import { ExternalLink } from 'lucide-react';

/** Supports YouTube, Vimeo, Google Drive share links and direct video files (mp4/webm/ogg). */
export function embedUrl(url: string): { kind: 'iframe' | 'video' | 'link'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const id = u.searchParams.get('v') ?? u.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/)?.[2];
      if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = u.pathname.match(/(\d{5,})/)?.[1];
      if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }
    if (host === 'drive.google.com') {
      const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get('id');
      if (id) return { kind: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` };
    }
    if (/\.(mp4|webm|ogg|ogv|mov)$/i.test(u.pathname)) return { kind: 'video', src: url };
  } catch {
    /* invalid URL: fall through */
  }
  return { kind: 'link', src: url };
}

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const e = embedUrl(url);
  if (e.kind === 'link') {
    return (
      <a href={e.src} target="_blank" rel="noopener noreferrer"
        className="flex aspect-video w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800">
        <ExternalLink size={18} /> Buka video di tab baru
      </a>
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow">
      {e.kind === 'iframe'
        ? <iframe src={e.src} title={title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <video src={e.src} controls className="h-full w-full" preload="metadata" />}
    </div>
  );
}
