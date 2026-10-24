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
export const INTRO_CARD = { tag: 'JEEMU', text: 'We help people achieve deeper connections without the awkwardness of starting the conversation.', foot: 'SCROLL TO START' };

// Shown one after another from the moment the block taps the base. The last one stays.
export const SCREEN_CARDS = [
  { tag: 'QUESTION 07', text: "What's the worst way you've ever started a conversation?", foot: 'TAP THE NEXT BLOCK' },
  { tag: 'KICKSTARTER / NOVEMBER', text: 'Early bird $89.99 USD.', cta: 'JOIN THE WAITLIST' }
];
