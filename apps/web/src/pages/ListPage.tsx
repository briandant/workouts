import { formatMinutes, type Collection, type Tag as TagName, type Workout } from '@workouts/core';
import { ChevronLeft, ChevronRight, Clock, Search, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { groupByFocus, hasTag, matches, readTag, tagCounts } from '../components/workouts/browse.ts';
import { COLLECTION_PAGES, onPage } from '../components/workouts/collections.ts';
import { shape, stats } from '../components/workouts/shape.ts';
import { Icon } from '../components/ui/Icon.tsx';
import { Kicker } from '../components/ui/Kicker.tsx';
import { Segments } from '../components/ui/Segments.tsx';
import { Tag } from '../components/ui/Tag.tsx';
import { workouts } from '../data/workouts.ts';

/** The main list, or with `collection` that collection's own page (in its tone). */
export function ListPage({ collection }: { collection?: Collection }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const page = collection && COLLECTION_PAGES[collection];
  const list = onPage(workouts, collection);
  const tags = tagCounts(list);
  // Only a tag this page has counts; anything else in the URL shows the whole list.
  const tag = tags.find((t) => t.tag === readTag(params.get('tag')))?.tag;
  const groups = groupByFocus(list.filter((w) => hasTag(w, tag) && matches(w, query)));
  const search = useRef<HTMLInputElement>(null);

  // The query and tag live in the URL so Back from a workout returns to the same filtered list.
  const setParam = (key: 'q' | 'tag', value: string | undefined) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const setQuery = (q: string) => setParam('q', q);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div data-tone={page?.tone} className="mx-auto w-full max-w-6xl px-4 pt-5 pb-20 sm:px-6">
      <header className="flex items-center justify-between">
        {page ? (
          <Link to="/" className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted hover:text-ink">
            <Icon as={ChevronLeft} size={18} />
            Workouts
          </Link>
        ) : (
          <span className="font-display text-xl tracking-wide">
            Follow<span className="text-accent">-</span>along
          </span>
        )}
        <span className="text-sm text-muted">{list.length} workouts</span>
      </header>

      <h1 className="mt-10 mb-8 font-display text-[clamp(3.5rem,13vw,7.5rem)]">
        {page ? (
          <>
            {page.name} <span className="text-accent">workouts</span>
          </>
        ) : (
          <>
            Work<span className="text-accent">outs</span>
          </>
        )}
      </h1>

      {!page && <CollectionLinks />}

      <div className="mb-10 flex flex-col gap-4">
      <search className="relative block max-w-xl">
        <Icon
          as={Search}
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        />
        <input
          ref={search}
          type="search"
          aria-label="Search workouts"
          placeholder="Search workouts, moves, equipment…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.preventDefault();
              setQuery('');
            }
          }}
          className="h-12 w-full rounded-md border border-line bg-surface pr-20 pl-11 text-ink placeholder:text-faint focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              search.current?.focus();
            }}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-muted hover:text-ink"
          >
            <Icon as={X} size={16} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-sm border border-line px-1.5 text-xs text-faint">
            /
          </kbd>
        )}
      </search>

      {tags.length > 0 && <TagFilter tags={tags} chosen={tag} onChoose={(t) => setParam('tag', t)} />}
      </div>

      {groups.length === 0 && (
        <p className="text-muted">
          No {tag && `${tag} `}workouts match “{query.trim()}”.
        </p>
      )}

      <div className="flex flex-col gap-12">
        {groups.map((g) => (
          <section key={g.focus} aria-labelledby={`focus-${g.focus}`}>
            <h2 id={`focus-${g.focus}`} className="mb-4 flex items-baseline gap-3 font-display text-3xl">
              {g.focus}
              <span className="font-body text-sm font-medium text-muted normal-case">{g.workouts.length}</span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.workouts.map((w) => (
                <WorkoutCard key={w.id} w={w} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* One chip per tag on this page. All, or the chosen chip pressed again, clears the filter. */
function TagFilter({
  tags,
  chosen,
  onChoose,
}: {
  tags: { tag: TagName; count: number }[];
  chosen?: TagName;
  onChoose: (tag?: TagName) => void;
}) {
  return (
    <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
      <Chip pressed={!chosen} onClick={() => onChoose(undefined)}>
        All
      </Chip>
      {tags.map(({ tag, count }) => (
        <Chip key={tag} pressed={tag === chosen} onClick={() => onChoose(tag === chosen ? undefined : tag)}>
          {tag}{' '}
          <span className="tabular-nums opacity-60">{count}</span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
        pressed ? 'border-accent bg-accent text-on-accent' : 'border-line text-muted hover:border-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/* A link to each collection's page, drawn in that page's tone. */
function CollectionLinks() {
  return (
    <nav aria-label="More workouts" className="mb-8 flex max-w-xl flex-col gap-3">
      {Object.entries(COLLECTION_PAGES).map(([id, p]) => (
        <Link
          key={id}
          to={p.path}
          data-tone={p.tone}
          className="group flex items-center justify-between gap-4 rounded-card border border-accent bg-surface px-5 py-4 transition hover:bg-raised"
        >
          <span className="font-display text-3xl text-accent">{p.name} workouts</span>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            {onPage(workouts, id as Collection).length} workouts
            <Icon as={ChevronRight} size={18} className="text-accent transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </nav>
  );
}

function WorkoutCard({ w }: { w: Workout }) {
  const s = stats(w);
  return (
    <li>
      <Link
        to={`/w/${w.id}`}
        className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-accent hover:bg-raised"
      >
        <Kicker>{w.level}</Kicker>
        <span className="font-display text-4xl transition-colors group-hover:text-accent">{w.title}</span>
        <span className="text-sm text-muted">{w.summary}</span>
        <Segments items={shape(w)} className="mt-auto h-1.5 pt-0" />
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted">
          <span className="flex items-center gap-1.5">
            <Icon as={Clock} size={14} />
            {formatMinutes(s.totalSeconds)}
          </span>
          <span>{s.moves} moves</span>
          {w.tags && (
            <span className="ml-auto flex flex-wrap gap-1.5">
              {w.tags.map((t) => (
                <Tag key={t} tone="muted">
                  {t}
                </Tag>
              ))}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
