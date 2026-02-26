// sm-2 spaced repetition.
// quality: again=0, hard=3, good=4, easy=5
// ease' = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
// minimum ease 1.3
// q < 3 -> reset (interval=1, reps=0)
// else first review interval=1, second=6, then prev_interval * ease

const DAY_MS = 24 * 60 * 60 * 1000;

function newCardScheduling() {
  return {
    ease: 2.5,
    interval: 0,
    reps: 0,
    nextReview: Date.now() // due immediately
  };
}

function applyReview(card, q, now) {
  if (typeof now !== "number") now = Date.now();

  let ease = card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  let interval, reps;
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps = card.reps + 1;
    if (reps === 1) {
      interval = 1;
    } else if (reps === 2) {
      interval = 6;
    } else {
      interval = Math.round(card.interval * ease);
      if (interval < 1) interval = 1;
    }
  }

  return {
    ease: ease,
    interval: interval,
    reps: reps,
    nextReview: now + interval * DAY_MS
  };
}

window.SM2 = { newCardScheduling, applyReview, DAY_MS };
