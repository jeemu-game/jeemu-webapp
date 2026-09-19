/**
 * JEEMU COMMUNITY & TEAM POSTS STORE
 * Manages persistent posts for:
 * - Feed (Official Updates & Devlogs)
 * - Chaos (Shitposting, Tower Fails, Unhinged Prompts)
 * - Journey (Founder Story & Hardware Evolution Timeline)
 */

const STORAGE_KEY_FEED = 'jeemu_posts_feed';
const STORAGE_KEY_CHAOS = 'jeemu_posts_chaos';
const STORAGE_KEY_JOURNEY = 'jeemu_posts_journey';

// Initial seed posts created by the team
const SEED_FEED = [
  {
    id: 'feed_1',
    author: 'Anna Vu',
    role: 'Hardware & Industrial Design',
    authorInitials: 'AV',
    date: 'Sep 18, 2026',
    title: 'Batch #3 Beechwood Milling: Custom Chamfer & Friction Testing',
    category: 'Hardware',
    content: 'We tested 4 different wood finishes this week. High-gloss polyurethane looks shiny on photos, but in real play it caused the blocks to stick together unpredictably when pulling from the middle levels. We settled on a bespoke double-sanded beeswax matte polish. It provides the signature buttery Jenga slide while maintaining a silky tactile warmth in your hand. Each block is also laser-etched with the micro-NFC marker on both sides.',
    image: '/images/jeemu-hardware.jpg',
    likes: 42,
    comments: 9
  },
  {
    id: 'feed_2',
    author: 'Ishaan',
    role: 'Embedded Firmware & NFC',
    authorInitials: 'IS',
    date: 'Sep 14, 2026',
    title: 'Firmware v2.4: Achieving Sub-80ms Tag Detection on the Dock',
    category: 'Firmware',
    content: 'The biggest headache with earlier prototypes was the delay between slamming a block on the reader and seeing the OLED prompt appear. If it takes more than 300ms, the physical party rhythm is interrupted. With our custom dual-antenna coil arrangement inside the dock and SPI bus tuning, we brought tag response time down to 78 milliseconds. It feels instantaneous. Tap -> OLED burst.',
    likes: 67,
    comments: 14
  },
  {
    id: 'feed_3',
    author: 'Shiva Manickam',
    role: 'Platform & AI Architecture',
    authorInitials: 'SM',
    date: 'Sep 09, 2026',
    title: 'Why AI Game Creation Changes Everything',
    category: 'AI Engine',
    content: 'Traditional board games are static. You play 3 times and memorize all the cards. With Jeemu\'s mobile companion, you can literally type "Spicy Date Night for couple celebrating 5th anniversary who love sushi" and our model populates 45 custom prompt blocks in 8 seconds. You sync it via Bluetooth to the dock once, then turn your phone OFF for the entire game.',
    likes: 89,
    comments: 23
  }
];

const SEED_CHAOS = [
  {
    id: 'chaos_1',
    author: 'Jack',
    role: 'Game Systems',
    authorInitials: 'JK',
    date: 'Yesterday',
    tag: '💀 EPIC FAIL',
    content: 'Playtester Marcus tried to remove Block #45 using his elbows because the rule said "non-dominant limb". The entire 32-level tower collapsed into Anna\'s gin & tonic. 10/10 gameplay experience.',
    reactions: { rip: 54, chaos: 38, sip: 29 }
  },
  {
    id: 'chaos_2',
    author: 'Shefali',
    role: 'Community',
    authorInitials: 'SH',
    date: '2 days ago',
    tag: '🍺 UNHINGED DARE',
    content: 'New prompt submission approved for the "After Dark" expansion pack: "Call your most recent food delivery driver and thank them for changing your life, or finish your beverage." Who hurt the person who submitted this??',
    reactions: { rip: 19, chaos: 82, sip: 45 }
  },
  {
    id: 'chaos_3',
    author: 'Yana C',
    role: 'Operations',
    authorInitials: 'YC',
    date: '4 days ago',
    tag: '🧪 LAB OUTTAKE',
    content: 'Engineering note: Do NOT stack 45 blocks horizontally on the OLED dock to test "simultaneous read capability". It threw error code #420: "Too much wood on desk".',
    reactions: { rip: 41, chaos: 65, sip: 18 }
  },
  {
    id: 'chaos_4',
    author: 'Ishaan',
    role: 'Firmware',
    authorInitials: 'IS',
    date: 'Last week',
    tag: '👀 OVERHEARD',
    content: '"Wait, so the wooden block knows I\'m drinking tequila right now?" — Actual quote from a Friday playtester after Block #14 commanded him to take a lime shot.',
    reactions: { rip: 12, chaos: 44, sip: 63 }
  }
];

const SEED_JOURNEY = [
  {
    id: 'journey_1',
    milestone: 'Phase 1: The Frustration',
    date: 'January 2026',
    author: 'Shiva & Jack',
    title: 'Classic Jenga is great for 15 minutes, then gathers dust.',
    description: 'We were hosting our weekly game night in Shiva\'s apartment. After three rounds of standard Jenga, people started checking their phones. We taped index cards with handwritten drinking dares to each block. It was hilarious, but within 2 games the tape peeled and the questions were stale. We asked: what if the physical wood could dynamically trigger ANY game mode digitally?',
    badge: 'The Spark'
  },
  {
    id: 'journey_2',
    milestone: 'Phase 2: Prototype V1 (Garage Hack)',
    date: 'March 2026',
    author: 'Anna & Ishaan',
    title: 'Drilling 45 blocks and frying two Arduino Nanos.',
    description: 'We bought standard Jenga sets, drilled micro cavities into each block with a Dremel press, and embedded 13.56MHz NFC coin tags glued with wood epoxy. The first reader was a messy tangle of jumper wires, a breadboard, and an Arduino taped to a cardboard shoe box. But the first time we tapped Block #7 and saw "DRINK 2 SIPS" appear on an LCD, we knew we had a real product.',
    badge: 'First Hardware'
  },
  {
    id: 'journey_3',
    milestone: 'Phase 3: The Custom Dock & Standalone OS',
    date: 'June 2026',
    author: 'Entire Team',
    title: 'Zero phones at the table. Standalone hardware decision.',
    description: 'Early feedback was unanimous: gamers hate staring at apps while playing tabletop games. We made the bold architectural choice to build the Jeemu Smart Box as a standalone game master. It holds the high-speed reader, internal battery, and crisp amber OLED display. You sync game configurations in 5 seconds via Bluetooth, then put all phones in another room.',
    badge: 'Core Breakthrough'
  },
  {
    id: 'journey_4',
    milestone: 'Phase 4: Kickstarter Pre-Launch & Community',
    date: 'Present Day',
    author: 'Yana & Shefali',
    title: 'Tooling ready, VIP reservations live, launching soon.',
    description: 'We finalized our manufacturing tooling partnerships for beechwood precision milling and injection-molded matte docks. Our pre-launch Kickstarter waitlist has passed 1,800 backers. We are ready to revolutionize tabletop gaming together.',
    badge: 'Ready for Launch'
  }
];

class PostsStore {
  constructor() {
    this._initStore();
  }

  _initStore() {
    if (!localStorage.getItem(STORAGE_KEY_FEED)) {
      localStorage.setItem(STORAGE_KEY_FEED, JSON.stringify(SEED_FEED));
    }
    if (!localStorage.getItem(STORAGE_KEY_CHAOS)) {
      localStorage.setItem(STORAGE_KEY_CHAOS, JSON.stringify(SEED_CHAOS));
    }
    if (!localStorage.getItem(STORAGE_KEY_JOURNEY)) {
      localStorage.setItem(STORAGE_KEY_JOURNEY, JSON.stringify(SEED_JOURNEY));
    }
  }

  getFeed() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_FEED) || '[]');
  }

  getChaos() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CHAOS) || '[]');
  }

  getJourney() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_JOURNEY) || '[]');
  }

  addFeedPost(post) {
    const list = this.getFeed();
    const newPost = {
      id: 'feed_' + Date.now(),
      author: post.author || 'Jeemu Creator',
      role: post.role || 'Core Team',
      authorInitials: post.authorInitials || 'JC',
      date: 'Just now',
      title: post.title,
      category: post.category || 'Announcement',
      content: post.content,
      image: post.image || null,
      likes: 1,
      comments: 0
    };
    list.unshift(newPost);
    localStorage.setItem(STORAGE_KEY_FEED, JSON.stringify(list));
    return newPost;
  }

  addChaosPost(post) {
    const list = this.getChaos();
    const newPost = {
      id: 'chaos_' + Date.now(),
      author: post.author || 'Team Member',
      role: post.role || 'Contributor',
      authorInitials: post.authorInitials || 'TM',
      date: 'Just now',
      tag: post.tag || '🔥 CHAOS',
      content: post.content,
      reactions: { rip: 0, chaos: 1, sip: 0 }
    };
    list.unshift(newPost);
    localStorage.setItem(STORAGE_KEY_CHAOS, JSON.stringify(list));
    return newPost;
  }

  addJourneyMilestone(post) {
    const list = this.getJourney();
    const newMilestone = {
      id: 'journey_' + Date.now(),
      milestone: post.milestone || `Phase ${list.length + 1}`,
      date: post.date || 'Present',
      author: post.author || 'Team',
      title: post.title,
      description: post.content,
      badge: post.badge || 'Milestone'
    };
    list.push(newMilestone);
    localStorage.setItem(STORAGE_KEY_JOURNEY, JSON.stringify(list));
    return newMilestone;
  }

  reactToChaos(postId, type) {
    const list = this.getChaos();
    const item = list.find(p => p.id === postId);
    if (item && item.reactions) {
      item.reactions[type] = (item.reactions[type] || 0) + 1;
      localStorage.setItem(STORAGE_KEY_CHAOS, JSON.stringify(list));
    }
    return item;
  }

  likeFeedPost(postId) {
    const list = this.getFeed();
    const item = list.find(p => p.id === postId);
    if (item) {
      item.likes = (item.likes || 0) + 1;
      localStorage.setItem(STORAGE_KEY_FEED, JSON.stringify(list));
    }
    return item;
  }
}

export const postsStore = new PostsStore();
