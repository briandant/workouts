import {
  describePlayStep,
  describeStep,
  formatClock,
  formatMinutes,
  sequence,
  summarize,
  type Workout,
} from '@workouts/core';

/** A compact, id-annotated view of a workout, so Claude can address blocks and steps by id. */
export function outline(w: Workout): string {
  const s = summarize(w);
  const lines = [`${w.id}: ${w.title} (${w.focus} · ${w.level} · ~${formatMinutes(s.totalSeconds)})`, w.summary];
  if (w.equipment) lines.push(`Equipment: ${w.equipment.join(', ') || 'none'}`);
  for (const b of w.blocks) {
    const extra = [
      b.rounds ? `${b.rounds} rounds` : '',
      b.restBetweenRounds ? `${formatClock(b.restBetweenRounds)} rest between rounds` : '',
    ].filter(Boolean);
    lines.push('', `[block ${b.id}] ${b.name}${extra.length ? ' · ' + extra.join(' · ') : ''}`);
    if (!b.steps.length) lines.push('  (no steps)');
    for (const st of b.steps) {
      const name = st.kind === 'rest' ? 'Rest' : st.name;
      const notes = st.kind === 'rest' ? [] : [st.kind === 'sets' && st.rest ? `${formatClock(st.rest)} rest between sets` : '', st.cue ?? '', st.video ? `video: ${st.video}` : ''];
      const note = notes.filter(Boolean).join(' · ');
      lines.push(`  [${st.id}] ${st.kind}: ${name}  ${describeStep(st)}${note ? `  (${note})` : ''}`);
    }
  }
  return lines.join('\n');
}

/** The flattened play order with running time, for checking timing. */
export function preview(w: Workout): string {
  const steps = sequence(w, { getReady: 0 });
  let t = 0;
  const lines = steps.map((x, i) => {
    const at = formatClock(t);
    t += x.est;
    const ctx = [x.rounds > 1 ? `round ${x.round}/${x.rounds}` : '', x.sets > 1 && x.kind !== 'rest' ? `set ${x.set}/${x.sets}` : '']
      .filter(Boolean)
      .join(', ');
    const est = x.kind === 'reps' ? ` (~${formatClock(x.est)})` : '';
    return `${String(i + 1).padStart(3)}. ${at}  ${x.name}  ${describePlayStep(x)}${est}  — ${x.block}${ctx ? `, ${ctx}` : ''}`;
  });
  const s = summarize(w);
  return [
    `${w.title}: ${steps.length} player steps, ${s.moves} moves, about ${formatMinutes(s.totalSeconds)} (${formatClock(s.totalSeconds)}).`,
    'Rep steps are estimated at 3 s per rep (doubled per side). The player adds a 5 s get-ready first.',
    '',
    ...lines,
  ].join('\n');
}
