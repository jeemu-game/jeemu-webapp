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
  fitness: {
    id: 'fitness',
    name: 'Fitness Challenges',
    modeTitle: 'MODE: FITNESS CHALLENGES',
    blocks: {
      7: { tag: 'Plank Hold', text: 'Drop and hold a 30-second plank before the next player takes their turn!' },
      14: { tag: 'Wall Sit', text: 'Assume a 90-degree wall sit for 45 seconds. Drop early = 10 pushups!' },
      23: { tag: 'Jumping Jacks', text: 'Rip out 20 crisp jumping jacks while maintaining eye contact with the tower.' },
      36: { tag: 'Squat Challenge', text: 'Do 15 deep air squats while balancing this wooden block on your head!' },
      45: { tag: 'Final Burn', text: 'Everyone in the room does 10 burpees with you, or the tower is declared hostile!' }
    }
  },
  kids: {
    id: 'kids',
    name: 'Kids Math & Trivia',
    modeTitle: 'MODE: KIDS MATH & TRIVIA',
    blocks: {
      7: { tag: 'Math Puzzle', text: 'Quick Math: What is 7 × 8 minus 14? You have 10 seconds to shout it!' },
      14: { tag: 'Nature Trivia', text: 'Which animal sleeps while floating on water holding hands with its friend? (Answer: Sea Otter)' },
      23: { tag: 'Brain Teaser', text: 'I have hands but cannot clap. I have a face but no eyes. What am I? (Answer: A Clock)' },
      36: { tag: 'Space Science', text: 'Name the largest planet in our solar system! (Answer: Jupiter)' },
      45: { tag: 'Master Challenge', text: 'Spell the word "CHALLENGE" backward without writing it down!' }
    }
  },
  weddings: {
    id: 'weddings',
    name: 'Weddings & Events',
    modeTitle: 'MODE: WEDDINGS & RECEPTION',
    blocks: {
      7: { tag: 'Love Story', text: 'Share your favorite memory of when the couple first started dating.' },
      14: { tag: 'Guest Toast', text: 'Raise your glass and give a 15-second impromptu rhyming toast to the newlyweds!' },
      23: { tag: 'Table Battle', text: "Table Challenge: Which table can sing the loudest chorus of the couple's first dance song?" },
      36: { tag: 'Secret Advice', text: 'Share one piece of funny marriage advice you wish someone had told you.' },
      45: { tag: 'Dance Floor', text: 'The player who pulled this block must immediately lead the room to the dance floor!' }
    }
  },
  workshops: {
    id: 'workshops',
    name: 'Team Workshops',
    modeTitle: 'MODE: TEAM WORKSHOP',
    blocks: {
      7: { tag: 'Sprint Retro', text: 'Name one process friction our team eliminated this month that made you happy.' },
      14: { tag: 'Crazy 8s', text: 'Pitch a solution to our hardest backlog bug using only 3 words.' },
      23: { tag: 'Peer Shoutout', text: 'Recognize a colleague who helped unblock you unexpectedly this quarter.' },
      36: { tag: 'Blue Sky', text: 'If our project budget was multiplied 10× tomorrow, what wild feature would you build?' },
      45: { tag: 'Team Pledge', text: 'Declare one team commitment you will champion before the end of the sprint.' }
    }
  },
  cafe: {
    id: 'cafe',
    name: 'Café & Hospitality',
    modeTitle: 'MODE: CAFÉ & HOSPITALITY',
    blocks: {
      7: { tag: 'Coffee Origin', text: 'Name 3 coffee-growing countries in South America to unlock a free pastry stamp!' },
      14: { tag: 'Espresso Dare', text: "Order the barista's personal favorite drink, whatever it happens to be." },
      23: { tag: 'Board Game Lore', text: 'Who invented classic tumbling towers in 1983? (Answer: Leslie Scott)' },
      36: { tag: 'Table Rivalry', text: 'Challenge the nearest adjacent table to pull the next block without speaking.' },
      45: { tag: 'Champion Stamp', text: 'Tower survived 45 levels! Show this screen to the cashier for 15% off your table tab.' }
    }
  },
  ai: {
    id: 'ai',
    name: 'AI Theme Generator',
    modeTitle: 'MODE: AI THEME - CYBERPUNK HEIST',
    blocks: {
      7: { tag: 'AI Generated', text: 'FIREWALL BREACH: Bypass terminal security by tapping the block 3 times in rhythm.' },
      14: { tag: 'AI Generated', text: 'NEURAL JAM: Pick a squad mate to be your operator. They must guide your hands without speaking.' },
      23: { tag: 'AI Generated', text: 'DATA EXTRACTION: Download 500TB. Answer 2 cybersecurity questions or trip the alarm.' },
      36: { tag: 'AI Generated', text: 'BLACK MARKET: Trade this block with any player in exchange for immunity next round.' },
      45: { tag: 'AI Generated', text: 'EXTRACTION POINT: Tower compromised! Balance this block on the top level within 15 seconds!' }
    }
  }
};
