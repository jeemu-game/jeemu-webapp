// All words in the "Tonight" scroll story. Handwriting on a polaroid fits about 30 characters.
import { EARLY_BIRD_PRICE, LAUNCH_DATE } from '../../data/offer';

// What the live Jeemu screen shows in each shot (drawn at the device's 320 x 240 and warped onto the render)
export const SCREENS = {
  intro: { tag: 'JEEMU', text: 'The best game nights start with one good question.', foot: 'Scroll to start' },
  wide: { tag: 'JEEMU', text: 'Pull a block to begin.', foot: '' },
  question: { tag: 'NEW QUESTION', text: "What's a small thing that made you happy this week?", foot: 'Block 23' },
  late: { tag: `KICKSTARTER · ${LAUNCH_DATE.toUpperCase()}`, text: "Early bird prices are the best you'll see.", foot: 'Join the waitlist' }
};

// Words over the picture while the room is in view
export const CAPTIONS = {
  wide: { kicker: 'Tonight', title: "You already know this tower.", sub: "You don't know this version." },
  play: { kicker: 'Pull. Tap. Answer.', title: 'Let Jeemu bring a new question to every round.', sub: '' }
};

// The photos from tonight, in the order the camera visits them on the table.
// note: written on the polaroid in handwriting; title/body: the clean text beside it (also what screen readers get).
export const POLAROIDS = [
  { photo: 'photos/1.jpg', note: 'Jeemu on every block', title: 'Stack', body: 'A wooden tower of standard size blocks, with Jeemu on every one.' },
  { photo: 'photos/2.jpg', note: 'Pull one out. Gently...', title: 'Pull', body: 'Slide a block out the way you always have. Each one carries an NFC chip.' },
  { photo: 'photos/3.jpg', note: 'Tap it on the base', title: 'Tap', body: 'Touch the block to the Jeemu mark on the base. The reader sits just behind it.' },
  { photo: 'photos/4.jpg', note: 'and then... the question', title: 'Answer', body: 'A question appears on the screen. Play it, then place the block back on top.' },
  { photo: 'photos/5.jpg', note: 'never ran out of questions', title: 'I never run out of questions.', body: 'New ones keep arriving, and you can write your own in the Jeemu app.' },
  { photo: 'photos/6.jpg', note: 'base, blocks, cable. done.', title: "What's in the box", body: 'The Jeemu base, NFC blocks, a charging cable, and a sleeve with instructions.' }
];
// pictures for polaroids that lie on the table but are not visited (render polaroid 7 onwards)
export const EXTRA_PHOTOS = ['photos/7.jpg'];

export const FINALE = {
  title: 'Be there when it falls.',
  sub: `Early bird prices are the best you'll see. Kickstarter, ${LAUNCH_DATE}. Early bird ${EARLY_BIRD_PRICE} USD.`,
  cta: 'Join the waitlist'
};
