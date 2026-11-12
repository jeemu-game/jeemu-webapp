// The story has three stops (frame numbers in the 30 fps render). Scrolling plays on to the next one.
//   0   close-up of the screen, the tagline on it
//   132 pulled back, tower built, the whole product in view
//   395 close-up of the screen again after the tap: the question, then the call to action
export const STOPS = [0, 132, 395];

// No text boxes: every word lives on the pixel screen. These are just the rail labels.
export const STAGES = [
  { id: 'intro', rail: '01' },
  { id: 'tower', rail: '02' },
  { id: 'read', rail: '03' }
];

// Which frames show which screen content. Between INTRO_UNTIL and the tap the render's own logo shows (the screen is tiny then).
export const INTRO_UNTIL = 54;
export const INTRO_CARD = { tag: 'JEEMU', text: 'The best game nights start with one good question.', foot: 'SCROLL TO START' };

// Shown over the picture (the screen is too small to read) while the whole tower is in view.
export const TOWER_CAPTION = "You already know this tower. You don't know this version.";

// Shown one after another from the moment the block taps the base. The last one stays.
export const SCREEN_CARDS = [
  { tag: 'NEW QUESTION', text: 'Let Jeemu bring that new question to every round.', foot: '' },
  { tag: 'KICKSTARTER / 24 NOV', text: "Hop in early. Early bird prices are the best you'll see.", cta: 'JOIN THE WAITLIST' }
];
