/**
 * Jeemu 7 Official Experience Categories & Multi-Block Prompts
 * Exact block mapping and challenges from the game rules archive.
 */

export const EXPERIENCE_PACKS = [
  {
    id: 'drinking',
    name: 'Drinking Games',
    icon: 'Beer',
    tag: 'Spicy / 21+',
    summary: 'Unhinged party challenges, partner drink penalties, and high-stakes tower dares.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'High Peril', text: 'Choose another player. Both of you must keep one eye closed until the next turn or take 2 sips!', penalty: '2 Sips or Close Eye' },
      14: { tag: 'Core Twist', text: 'TRUTH OR DARE: Reveal your most embarrassing purchase, or finish your entire drink.', penalty: 'Finish Drink or Reveal' },
      23: { tag: 'Group Dare', text: 'WATERFALL: The player who pulled this starts drinking. Everyone drinks in clockwise order until they stop!', penalty: 'Clockwise Waterfall' },
      36: { tag: 'Secret Rule', text: 'SILENT TOWER: No player may speak above a whisper for the next 3 rounds. Penalty: 1 sip per word.', penalty: '1 Sip Per Spoken Word' },
      45: { tag: 'Tower Climax', text: 'DEATHMATCH: You must place this block on top using only your non-dominant hand. If it falls, you buy pizza!', penalty: 'Non-Dominant Hand Pull' }
    }
  },
  {
    id: 'icebreakers',
    name: 'Icebreakers & Social',
    icon: 'Sparkles',
    tag: 'All Ages / Gatherings',
    summary: 'Deep conversations, two truths & a lie, and spicy confessions designed to spark real connection.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'Hot Take', text: 'What is an opinion you hold that 90% of your friends disagree with?', penalty: 'Share or Pass' },
      14: { tag: 'Nostalgia', text: 'Describe your first childhood obsession or weirdest hobby before age 12.', penalty: 'Confess Hobby' },
      23: { tag: 'Hypothetical', text: 'If you could instantly become world-class at any skill overnight, what would it be?', penalty: 'Dream Skill' },
      36: { tag: 'Wild Card', text: 'Switch seats with the person sitting directly opposite you without touching the table.', penalty: 'Switch Seats' },
      45: { tag: 'Climax Prompt', text: 'Give a 30-second sincere compliment to the person on your left.', penalty: 'Sincere Compliment' }
    }
  },
  {
    id: 'fitness',
    name: 'Fitness & Movement',
    icon: 'Dumbbell',
    tag: 'High Energy / Active',
    summary: 'Physical activities, micro-workouts, balance tests, and explosive team movement challenges.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'Strength', text: 'Hold a 30-second plank before the next player can touch any block.', penalty: '30s Plank' },
      14: { tag: 'Agility', text: 'Do 15 rapid mountain climbers while counting backward from 15 out loud.', penalty: '15 Mountain Climbers' },
      23: { tag: 'Endurance', text: 'WALL-SIT: Hold a 90-degree wall sit while answering 3 trivia questions from the group.', penalty: 'Wall-Sit Hold' },
      36: { tag: 'Balance', text: 'Stand on one foot while placing this block back onto the top level.', penalty: 'One Foot Balance' },
      45: { tag: 'Final Burn', text: 'Everyone in the room does 10 burpees with you, or the tower is declared hostile!', penalty: '10 Burpees Everyone' }
    }
  },
  {
    id: 'math',
    name: 'Kids Math & Logic',
    icon: 'Brain',
    tag: 'Family / STEM',
    summary: 'Mental math riddles, geometric puzzles, and tactical trivia engineered for children and parents.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'Quick Math', text: 'Quick Math: What is 7 × 8 minus 14? You have 10 seconds to shout it!', penalty: '10s Countdown' },
      14: { tag: 'Nature Trivia', text: 'Which animal sleeps while floating on water holding hands with its friend? (Answer: Sea Otter)', penalty: 'Answer Trivia' },
      23: { tag: 'Brain Teaser', text: 'I have hands but cannot clap. I have a face but no eyes. What am I? (Answer: A Clock)', penalty: 'Riddle Solve' },
      36: { tag: 'Space Science', text: 'Name the largest planet in our solar system! (Answer: Jupiter)', penalty: 'Space Fact' },
      45: { tag: 'Master Challenge', text: 'Spell the word "CHALLENGE" backward without writing it down!', penalty: 'Backward Spelling' }
    }
  },
  {
    id: 'workshops',
    name: 'Team Workshops',
    icon: 'Briefcase',
    tag: 'Agile / Corporate',
    summary: 'Design thinking prompts, sprint retro icebreakers, and creative brainstorm ignition.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'Sprint Retro', text: 'Name one process friction our team eliminated this month that made you happy.', penalty: 'Team Retro Note' },
      14: { tag: 'Crazy 8s', text: 'Pitch a solution to our hardest backlog bug using only 3 words.', penalty: '3-Word Pitch' },
      23: { tag: 'Peer Shoutout', text: 'Recognize a colleague who helped unblock you unexpectedly this quarter.', penalty: 'Kudos Shoutout' },
      36: { tag: 'Blue Sky', text: 'If our project budget was multiplied 10× tomorrow, what wild feature would you build?', penalty: 'Moonshot Idea' },
      45: { tag: 'Team Pledge', text: 'Declare one team commitment you will champion before the end of the sprint.', penalty: 'Sprint Commitment' }
    }
  },
  {
    id: 'weddings',
    name: 'Weddings & Receptions',
    icon: 'HeartHandshake',
    tag: 'Celebration / Romantic',
    summary: 'Couple trivia, bridal party dares, guest table challenges, and anniversary toast prompts.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'Love Story', text: 'Share your favorite memory of when the couple first started dating.', penalty: 'Share Memory' },
      14: { tag: 'Guest Toast', text: 'Raise your glass and give a 15-second impromptu rhyming toast to the newlyweds!', penalty: 'Rhyming Toast' },
      23: { tag: 'Table Battle', text: 'Table Challenge: Which table can sing the loudest chorus of the couple\'s first dance song?', penalty: 'Chorus Sing-off' },
      36: { tag: 'Secret Advice', text: 'Share one piece of funny marriage advice you wish someone had told you.', penalty: 'Marriage Advice' },
      45: { tag: 'Dance Floor', text: 'The player who pulled this block must immediately lead the room to the dance floor!', penalty: 'Dance Floor Lead' }
    }
  },
  {
    id: 'cafe',
    name: 'Café & Hospitality',
    icon: 'Coffee',
    tag: 'Commercial / Casual',
    summary: 'Interactive games for coffee shops, board game bars, and customer loyalty rewards.',
    dockColor: '#00d97e',
    blocks: {
      7: { tag: 'Coffee Origin', text: 'Name 3 coffee-growing countries in South America to unlock a free pastry stamp!', penalty: 'Geography Quiz' },
      14: { tag: 'Espresso Dare', text: 'Order the barista\'s personal favorite drink, whatever it happens to be.', penalty: 'Barista Choice' },
      23: { tag: 'Board Game Lore', text: 'Who invented classic tumbling towers in 1983? (Answer: Leslie Scott)', penalty: 'Tabletop Trivia' },
      36: { tag: 'Table Rivalry', text: 'Challenge the nearest adjacent table to pull the next block without speaking.', penalty: 'Cross-Table Dare' },
      45: { tag: 'Champion Stamp', text: 'Tower survived 45 levels! Show this screen to the cashier for 15% off your table tab.', penalty: '15% Tab Discount' }
    }
  }
];
