/**
 * Jeemu 7 Official Experience Categories
 * Outlined in official product specs:
 * 1. Drinking Games
 * 2. Fitness Games
 * 3. Math Puzzles for Kids
 * 4. Workshops
 * 5. Ice-Breakers
 * 6. Weddings
 * 7. Cafe Experiences
 */

export const EXPERIENCE_PACKS = [
  {
    id: 'drinking',
    name: 'Drinking Games',
    icon: 'Beer',
    tag: 'Spicy / 21+',
    summary: 'Unhinged party challenges, partner drink penalties, and high-stakes tower dares.',
    samplePrompt: {
      blockNum: 38,
      title: 'PARTNER ROULETTE',
      action: 'Pick a partner. Both must remove one block using only your non-dominant hand or take 2 sips each.',
      penalty: '2 Sips or Drop',
      dockColor: '#ff6b35'
    }
  },
  {
    id: 'icebreakers',
    name: 'Icebreakers & Social',
    icon: 'Sparkles',
    tag: 'All Ages / Gatherings',
    summary: 'Deep conversations, two truths & a lie, and spicy confessions designed to spark real connection.',
    samplePrompt: {
      blockNum: 14,
      title: 'HOT SEAT CONFESSION',
      action: 'Share the most embarrassing purchase you made in the last 12 months, or pass to the person on your right.',
      penalty: 'Pass or Confess',
      dockColor: '#38bdf8'
    }
  },
  {
    id: 'fitness',
    name: 'Fitness & Movement',
    icon: 'Dumbbell',
    tag: 'High Energy / Active',
    summary: 'Physical activities, micro-workouts, balance tests, and explosive team movement challenges.',
    samplePrompt: {
      blockNum: 29,
      title: 'WALL SIT TIMEOUT',
      action: 'Hold a 45-second wall sit while the next player removes their block. If you drop before they pull, do 10 squats.',
      penalty: '10 Squats',
      dockColor: '#10b981'
    }
  },
  {
    id: 'math',
    name: 'Kids Math & Logic',
    icon: 'Brain',
    tag: 'Family / STEM',
    summary: 'Mental math riddles, geometric puzzles, and tactical trivia engineered for children and parents.',
    samplePrompt: {
      blockNum: 7,
      title: 'SPEED CALCULATION',
      action: 'What is 14 x 6 minus 23? You have 15 seconds to solve before the buzzer sounds.',
      penalty: 'Pass Turn',
      dockColor: '#a855f7'
    }
  },
  {
    id: 'workshops',
    name: 'Team Workshops',
    icon: 'Briefcase',
    tag: 'Agile / Corporate',
    summary: 'Design thinking prompts, sprint retro icebreakers, and creative brainstorm ignition.',
    samplePrompt: {
      blockNum: 42,
      title: 'WORST POSSIBLE IDEA',
      action: 'Pitch the most hilariously terrible solution to our current product blocker. The team votes on bravest pitch.',
      penalty: 'Award Team Token',
      dockColor: '#f59e0b'
    }
  },
  {
    id: 'weddings',
    name: 'Weddings & Receptions',
    icon: 'HeartHandshake',
    tag: 'Celebration / Romantic',
    summary: 'Couple trivia, bridal party dares, guest table challenges, and anniversary toast prompts.',
    samplePrompt: {
      blockNum: 19,
      title: 'THE HONEYMOON DARE',
      action: 'Tell the table the funniest honeymoon planning disaster the couple faced, then lead a table toast.',
      penalty: 'Raise a Glass',
      dockColor: '#ec4899'
    }
  },
  {
    id: 'cafe',
    name: 'Café & Hospitality',
    icon: 'Coffee',
    tag: 'Commercial / Casual',
    summary: 'Interactive games for coffee shops, board game bars, and customer loyalty rewards.',
    samplePrompt: {
      blockNum: 22,
      title: 'BARISTA TRIVIA',
      action: 'Name 3 coffee-growing regions in South America to unlock a 20% discount token at the counter.',
      penalty: 'Try Again',
      dockColor: '#14b8a6'
    }
  }
];
