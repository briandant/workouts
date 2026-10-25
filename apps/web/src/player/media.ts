/** A muted, looping YouTube embed URL for a watch/youtu.be/shorts link, or null if it isn't YouTube. */
export function youtubeEmbed(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  let id: string | null | undefined = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
    id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
  }
  if (!id) return null;
  const start = parseInt(u.searchParams.get('t') ?? u.searchParams.get('start') ?? '0', 10) || 0;
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    ...(start && { start: String(start) }),
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
