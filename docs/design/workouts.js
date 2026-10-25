/*
  Workout data for Follow-along. Replace these with your own.

  Workout:  { id, title, focus, level, summary, blocks: [Block] }
  Block:    { name, rounds?: number, restBetweenRounds?: seconds, steps: [Step] }
  Step (one of):
    Timed     { name, duration: seconds }
    Reps      { name, reps: number }                 tap "Done" to advance
    Sets      { name, sets, reps | duration, rest?: seconds between sets }
    Rest      { rest: seconds }
  Optional on any named step: cue (form note), perSide: true,
    video: a YouTube link (watch, youtu.be, shorts; ?t= sets the start) or a video file URL (.mp4/.webm).
    Steps without a video hide the demo area.
*/
export default [
  {
    id: 'seven-minute',
    title: 'Seven-Minute Circuit',
    focus: 'HIIT',
    level: 'All levels',
    summary: 'Twelve bodyweight moves, 30 seconds on and 10 off.',
    blocks: [
      {
        name: 'Main set',
        steps: [
          { name: 'Jumping jacks', duration: 30 }, { rest: 10 },
          { name: 'Wall sit', duration: 30, cue: 'Thighs parallel, back flat on the wall.' }, { rest: 10 },
          { name: 'Push-up', duration: 30 }, { rest: 10 },
          { name: 'Crunch', duration: 30 }, { rest: 10 },
          { name: 'Step-up', duration: 30, cue: 'Alternate legs each rep.' }, { rest: 10 },
          { name: 'Squat', duration: 30 }, { rest: 10 },
          { name: 'Triceps dip', duration: 30 }, { rest: 10 },
          { name: 'Plank', duration: 30, cue: 'Squeeze glutes; don’t let the hips sag.' }, { rest: 10 },
          { name: 'High knees', duration: 30 }, { rest: 10 },
          { name: 'Lunge', duration: 30 }, { rest: 10 },
          { name: 'Push-up with rotation', duration: 30 }, { rest: 10 },
          { name: 'Side plank', duration: 30 }
        ]
      }
    ]
  },
  {
    id: 'kettlebell-strength',
    title: 'Kettlebell Strength',
    focus: 'Strength',
    level: 'Intermediate',
    summary: 'Heavy sets with full recovery between them.',
    blocks: [
      {
        name: 'Warm-up',
        steps: [
          { name: 'Kettlebell halo', reps: 8, cue: 'Each direction.' },
          { name: 'Goblet squat hold', duration: 30 },
          { name: 'Hip hinge drill', reps: 10 }
        ]
      },
      {
        name: 'Main set',
        steps: [
          { name: 'Goblet squat', sets: 4, reps: 8, rest: 90, cue: 'Elbows inside knees, chest tall.' },
          { name: 'Single-arm row', sets: 3, reps: 10, perSide: true, rest: 60 },
          { name: 'Kettlebell swing', sets: 4, reps: 15, rest: 60, cue: 'Snap the hips; the arms only guide the bell.' }
        ]
      },
      {
        name: 'Cool-down',
        steps: [
          { name: 'Couch stretch', duration: 45, perSide: true },
          { name: 'Child’s pose', duration: 60 }
        ]
      }
    ]
  },
  {
    id: 'bodyweight-rounds',
    title: 'Bodyweight Rounds',
    focus: 'Circuit',
    level: 'Beginner',
    summary: 'Four rounds of push-ups, squats, sit-ups and a plank.',
    blocks: [
      {
        name: 'Warm-up',
        steps: [
          { name: 'Arm circles', duration: 30 },
          { name: 'Inchworm', reps: 5 }
        ]
      },
      {
        name: 'Circuit',
        rounds: 4,
        restBetweenRounds: 60,
        steps: [
          { name: 'Push-up', reps: 10 },
          { name: 'Air squat', reps: 15 },
          { name: 'Sit-up', reps: 20 },
          { name: 'Plank', duration: 30 }
        ]
      },
      {
        name: 'Cool-down',
        steps: [{ name: 'Hamstring stretch', duration: 45, perSide: true }]
      }
    ]
  },
  {
    id: 'tabata',
    title: 'Tabata Intervals',
    focus: 'Intervals',
    level: 'Advanced',
    summary: 'Eight rounds of 20 seconds all-out, 10 seconds rest.',
    blocks: [
      {
        name: 'Warm-up',
        steps: [
          { name: 'Jog in place', duration: 60 },
          { name: 'Leg swings', duration: 30 }
        ]
      },
      {
        name: 'Tabata',
        rounds: 8,
        steps: [
          { name: 'Burpee', duration: 20, cue: 'Full extension at the top.' },
          { rest: 10 }
        ]
      },
      {
        name: 'Cool-down',
        steps: [{ name: 'Walk it out', duration: 60 }]
      }
    ]
  },
  {
    id: 'morning-mobility',
    title: 'Morning Mobility',
    focus: 'Mobility',
    level: 'All levels',
    summary: 'Slow timed holds for hips, spine and shoulders.',
    blocks: [
      {
        name: 'Flow',
        steps: [
          { name: 'Cat-cow', duration: 45 },
          { name: 'Thread the needle', duration: 30, perSide: true },
          { rest: 10 },
          { name: '90/90 hip switch', duration: 45 },
          { name: 'Deep squat hold', duration: 60 },
          { rest: 10 },
          { name: 'Thoracic rotation', reps: 8, perSide: true },
          { name: 'Standing forward fold', duration: 45 }
        ]
      }
    ]
  }
];
