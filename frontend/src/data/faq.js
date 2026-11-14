// Questions people ask. On the site they're written on index cards on the table, one per scroll step.
import { EARLY_BIRD_PRICE, LAUNCH_DATE } from './offer';

export const FAQS = [
  { q: 'What is Jeemu?', a: 'A tower game where every wooden block carries a hidden NFC chip. Pull a block, tap it on the base, and the screen shows the prompt for that block in the game you picked.' },
  { q: 'Do I need my phone while playing?', a: 'No. You use the companion app to choose or edit a game and send it to the base. Once it is loaded, the base runs the game on its own. The app is still in development.' },
  { q: 'Can I make my own games?', a: 'That is the plan. In the app you will be able to write your own prompts, start from presets, and share games with other players. This is still being built.' },
  { q: 'When does it launch, and what does it cost?', a: `We launch on Kickstarter on ${LAUNCH_DATE}. The early bird price is ${EARLY_BIRD_PRICE} USD.` },
  { q: 'Do you ship worldwide?', a: 'Yes, we ship worldwide.' },
  { q: 'What do early-bird backers get?', a: `The ${EARLY_BIRD_PRICE} early-bird price. VIP waitlist members ($1) also get a free premium Jeemu carry bag. Joining the waitlist gets you first word when the campaign opens.` },
  { q: 'What are the blocks like?', a: 'Standard-size wooden blocks, each branded with the Jeemu name.' }
];
