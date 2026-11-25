// All words in the "Tonight" scroll story. Handwriting on a polaroid fits about 30 characters.
import { EARLY_BIRD_PRICE, LAUNCH_DATE } from '../../data/offer';

// What the live Jeemu screen shows in each shot (drawn at the device's 320 x 240 and warped onto the render)
export const SCREENS = {
  intro: { tag: 'JEEMU', text: 'The best game nights start with one good question.', foot: '' },
  wide: { tag: 'JEEMU', text: 'Ready when you are.', foot: '' },
  question: { tag: 'NEW QUESTION', text: "What's a small thing that made you happy this week?", foot: 'Block 23' },
  late: { tag: `KICKSTARTER · ${LAUNCH_DATE.toUpperCase()}`, text: "Early bird prices are the best you'll see.", foot: 'Keep scrolling' }
};

// Words over the picture while the room is in view
export const CAPTIONS = {
  wide: { kicker: 'Tonight', title: "You already know this tower.", sub: "You don't know this version." },
  play: { kicker: 'Pull. Tap. Answer.', title: 'Let Jeemu bring a new question to every round.', sub: '' }
};

// The photos from tonight, in the order the camera visits them on the table.
// note: written on the polaroid in handwriting; title/body: the clean text beside it (also what screen readers get).
export const POLAROIDS = [
  { photo: 'photos/h1.jpg', note: 'Pull one out. Gently...', title: 'Pull', body: 'Slide out a block. Each one has a chip inside.' },
  { photo: 'photos/h2.jpg', note: 'Tap it on the base', title: 'Tap', body: 'Touch it to the base. A question appears.' },
  { photo: 'photos/h3.jpg', note: 'never ran out of questions', title: 'Never the same twice', body: 'New question packs keep coming. Or write your own.' },
  { photo: 'photos/h4.jpg', note: 'any table, any crowd', title: 'Any crowd', body: 'Date night, family night, a full house.' }
];
// pictures for polaroids that lie on the table but are not visited
export const EXTRA_PHOTOS = ['photos/h5.jpg'];

export const FINALE = {
  title: 'Be there when it falls.',
  sub: `Early bird prices are the best you'll see. Kickstarter, ${LAUNCH_DATE}. Early bird ${EARLY_BIRD_PRICE} USD.`,
  subLive: `We're live on Kickstarter. Early bird ${EARLY_BIRD_PRICE} USD while the spots last.`,
  cta: 'Join the waitlist'
};

// ---- after the waitlist, on the late-night table (shot "top2")
// Our story: five prints along the front of the table. note: handwritten on the print; title/body: beside it.
// The full milestones (src/data/teamData.js) are also in the page for search engines and screen readers.
// Our story: still on the late-night table in the renders (the renderer reads it), no longer shown on the site.
export const STORY = [
  { photo: 'photos/s2.jpg', note: 'we asked everyone', title: 'The problem', body: "Everyone loves the tower game. We asked dozens of players, and once they'd seen every question, the box went back on the shelf and the phones came back out." },
  { photo: 'photos/s3.jpg', note: 'first prints!', title: 'The idea', body: 'Put the question on a smart base instead. We found a makerspace, 3D printed our first models and built the first Jeemu from parts sourced across China.' },
  { photo: 'photos/s1.jpg', note: 'Shanghai, nearly there...', title: 'Building in the open', body: "We're refining the prototype, writing question packs and getting ready for Kickstarter." }
]
// The team: one wide print; the camera stays on it while each of the six gets a turn beside it (src/data/teamData.js)
export const TEAM_PRINT = { photo: 'photos/team.jpg', note: 'the six of us' };

