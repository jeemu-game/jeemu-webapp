/**
 * Official Game Categories and Block Prompts for the Tactile Wooden Block Tapping Console
 * Exact copy from jeemu.fun / 2ecee11 archive
 */

export const SIMULATOR_CATEGORIES = {
  party: {
    id: 'party',
    name: 'Drinking & Party',
    modeTitle: 'MODE: DRINKING & PARTY',
    blocks: {
      7: { tag: 'High Peril', text: 'Choose another player. Both of you must keep one eye closed until the next turn or take 2 sips!' },
      14: { tag: 'Core Twist', text: "Swap seats with the player to your left without disturbing anyone's drinks!" },
      23: { tag: 'Group Dare', text: 'Social Roulette: All players must vote on who has the worst screen time today. Most votes takes 3 sips.' },
      36: { tag: 'Secret Rule', text: 'You are now the "Tower Guard". Whenever someone touches a block, they must ask your permission first.' },
      45: { tag: 'Tower Climax', text: 'CRITICAL PERIL: You must pull and place your next block using only your non-dominant hand!' }
    }
  },
  icebreaker: {
    id: 'icebreaker',
    name: 'Icebreakers & Social',
    modeTitle: 'MODE: ICEBREAKERS & SOCIAL',
    blocks: {
      7: { tag: 'Warm-up', text: 'What is the most useless skill you possess that you are secretly proud of?' },
      14: { tag: 'Storytime', text: 'Tell the table about the most embarrassing fashion trend you actually participated in.' },
      23: { tag: 'Hot Take', text: 'Declare your most controversial pop culture opinion. Defend it for 30 seconds!' },
      36: { tag: 'Confession', text: 'What is a lie you told as a child that your parents still believe to this day?' },
      45: { tag: 'Deep Question', text: 'If you could re-live any single 24-hour day from your past, which one would you choose?' }
    }
  },
  datenight: {
    id: 'datenight',
    name: 'Spicy Date Night',
    modeTitle: 'MODE: SPICY DATE NIGHT',
    blocks: {
      7: { tag: 'Flirt Check', text: 'Whisper your partner\'s most attractive everyday habit in their ear, or drink 2 sips.' },
      14: { tag: 'Throwback', text: 'Reenact the exact moment you first realized you had feelings for them.' },
      23: { tag: 'Touch Dare', text: 'Give your partner a 60-second shoulder massage without speaking a single word.' },
      36: { tag: 'Confession', text: 'What is a secret bucket-list trip you want only the two of you to take together?' },
      45: { tag: 'Climax Dare', text: 'Hold unbroken eye contact for 45 seconds. First person to look away takes a sip!' }
    }
  },
  dorm: {
    id: 'dorm',
    name: 'College Dorm Chaos',
    modeTitle: 'MODE: DORM ROOM CHAOS',
    blocks: {
      7: { tag: 'Late Night Call', text: 'Call your most recent food delivery driver and thank them for being an everyday hero.' },
      14: { tag: 'Elbow Pull', text: 'Non-dominant elbow pull only. If the tower drops, you buy the late-night pizza.' },
      23: { tag: 'Seat Shuffle', text: 'Switch seats with the person directly across from you without touching the floor.' },
      36: { tag: 'Raid The Fridge', text: 'Create a mystery mocktail from 3 items in the fridge and take a sip.' },
      45: { tag: 'Hostile Tower', text: 'Everyone in the room must hold a 30-second plank or the tower falls to the floor!' }
    }
  },
  trivia: {
    id: 'trivia',
    name: 'Brain Teasers & Trivia',
    modeTitle: 'MODE: BRAIN TEASERS',
    blocks: {
      7: { tag: 'Quick Math', text: 'Quick Math: What is 7 × 8 minus 14? You have 10 seconds to shout it!' },
      14: { tag: 'Nature Lore', text: 'Which animal sleeps while floating on water holding hands with its friend? (Answer: Sea Otter)' },
      23: { tag: 'Riddle', text: 'I have hands but cannot clap. I have a face but no eyes. What am I? (Answer: A Clock)' },
      36: { tag: 'Space Science', text: 'Name the largest planet in our solar system! (Answer: Jupiter)' },
      45: { tag: 'Master Challenge', text: 'Spell the word "CHALLENGE" backward out loud without pausing!' }
    }
  }
};
