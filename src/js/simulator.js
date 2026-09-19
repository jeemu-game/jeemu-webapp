/**
 * JEEMU HARDWARE & OLED SIMULATOR
 * Interactive demonstration of NFC wooden blocks tapping onto the smart box reader.
 */

import { analytics } from './analytics.js';

const GAME_CATEGORIES = {
  party: {
    name: 'MODE: DRINKING & PARTY',
    blocks: {
      7: { tag: 'High Peril', text: 'Choose another player. Both of you must keep one eye closed until the next turn or take 2 sips!' },
      14: { tag: 'Core Twist', text: 'TRUTH OR DARE: Reveal your most embarrassing purchase, or finish your entire drink.' },
      23: { tag: 'Group Dare', text: 'WATERFALL: The player who pulled this starts drinking. Everyone drinks in clockwise order until they stop!' },
      36: { tag: 'Secret Rule', text: 'SILENT TOWER: No player may speak above a whisper for the next 3 rounds. Penalty: 1 sip per word.' },
      45: { tag: 'Tower Climax', text: 'DEATHMATCH: You must place this block on top using only your non-dominant hand. If it falls, you buy pizza!' }
    }
  },
  icebreaker: {
    name: 'MODE: ICEBREAKERS & SOCIAL',
    blocks: {
      7: { tag: 'Hot Take', text: 'What is an opinion you hold that 90% of your friends disagree with?' },
      14: { tag: 'Nostalgia', text: 'Describe your first childhood obsession or weirdest hobby before age 12.' },
      23: { tag: 'Hypothetical', text: 'If you could instantly become world-class at any skill overnight, what would it be?' },
      36: { tag: 'Wild Card', text: 'Switch seats with the person sitting directly opposite you without touching the table.' },
      45: { tag: 'Climax Prompt', text: 'Give a 30-second sincere compliment to the person on your left.' }
    }
  },
  fitness: {
    name: 'MODE: FITNESS CHALLENGE',
    blocks: {
      7: { tag: 'Strength', text: 'Hold a 30-second plank before the next player can touch any block.' },
      14: { tag: 'Agility', text: 'Do 15 rapid mountain climbers while counting backward from 15 out loud.' },
      23: { tag: 'Endurance', text: 'WALL-SIT: Hold a 90-degree wall sit while answering 3 trivia questions from the group.' },
      36: { tag: 'Balance', text: 'Stand on one foot while placing this block back onto the top level.' },
      45: { tag: 'Final Burn', text: 'Everyone in the room does 10 burpees with you, or the tower is declared hostile!' }
    }
  },
  kids: {
    name: 'MODE: KIDS MATH & TRIVIA',
    blocks: {
      7: { tag: 'Math Puzzle', text: 'Quick Math: What is 7 × 8 minus 14? You have 10 seconds to shout it!' },
      14: { tag: 'Nature Trivia', text: 'Which animal sleeps while floating on water holding hands with its friend? (Answer: Sea Otter)' },
      23: { tag: 'Brain Teaser', text: 'I have hands but cannot clap. I have a face but no eyes. What am I? (Answer: A Clock)' },
      36: { tag: 'Space Science', text: 'Name the largest planet in our solar system! (Answer: Jupiter)' },
      45: { tag: 'Master Challenge', text: 'Spell the word "CHALLENGE" backward without writing it down!' }
    }
  },
  weddings: {
    name: 'MODE: WEDDINGS & RECEPTION',
    blocks: {
      7: { tag: 'Love Story', text: 'Share your favorite memory of when the couple first started dating.' },
      14: { tag: 'Guest Toast', text: 'Raise your glass and give a 15-second impromptu rhyming toast to the newlyweds!' },
      23: { tag: 'Table Battle', text: 'Table Challenge: Which table can sing the loudest chorus of the couple\'s first dance song?' },
      36: { tag: 'Secret Advice', text: 'Share one piece of funny marriage advice you wish someone had told you.' },
      45: { tag: 'Dance Floor', text: 'The player who pulled this block must immediately lead the room to the dance floor!' }
    }
  },
  workshops: {
    name: 'MODE: TEAM WORKSHOP',
    blocks: {
      7: { tag: 'Sprint Retro', text: 'Name one process friction our team eliminated this month that made you happy.' },
      14: { tag: 'Crazy 8s', text: 'Pitch a solution to our hardest backlog bug using only 3 words.' },
      23: { tag: 'Peer Shoutout', text: 'Recognize a colleague who helped unblock you unexpectedly this quarter.' },
      36: { tag: 'Blue Sky', text: 'If our project budget was multiplied 10× tomorrow, what wild feature would you build?' },
      45: { tag: 'Team Pledge', text: 'Declare one team commitment you will champion before the end of the sprint.' }
    }
  },
  ai: {
    name: 'MODE: AI THEME - CYBERPUNK HEIST',
    blocks: {
      7: { tag: 'AI Generated', text: 'FIREWALL BREACH: Bypass terminal security by tapping the block 3 times in rhythm.' },
      14: { tag: 'AI Generated', text: 'NEURAL JAM: Pick a squad mate to be your operator. They must guide your hands without speaking.' },
      23: { tag: 'AI Generated', text: 'DATA EXTRACTION: Download 500TB. Answer 2 cybersecurity questions or trip the alarm.' },
      36: { tag: 'AI Generated', text: 'BLACK MARKET: Trade this block with any player in exchange for immunity next round.' },
      45: { tag: 'AI Generated', text: 'EXTRACTION POINT: Tower compromised! Balance this block on the top level within 15 seconds!' }
    }
  }
};

class Simulator {
  constructor() {
    this.currentCategory = 'party';
    this.currentBlockId = 7;
    this.readCount = 1;
    this.isTyping = false;

    this._bindElements();
    this._bindEvents();
    this.updateDisplay(false);
  }

  _bindElements() {
    this.pills = document.querySelectorAll('.cat-pill');
    this.blockButtons = document.querySelectorAll('.wooden-block-btn');
    this.oledModeName = document.getElementById('oled-mode-name');
    this.oledBlockId = document.getElementById('oled-block-id');
    this.oledPromptText = document.getElementById('oled-prompt-text');
    this.oledReadCount = document.getElementById('oled-read-count');
    this.dockedAvatarText = document.getElementById('docked-block-text');
    this.nfcGlowRing = document.getElementById('nfc-glow-ring');
  }

  _bindEvents() {
    // Category pill switches
    this.pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = pill.dataset.cat;
        if (!cat || cat === this.currentCategory) return;

        this.pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        this.currentCategory = cat;
        this.updateDisplay(true);
      });
    });

    // Wooden block clicks (tapping onto NFC dock)
    this.blockButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const blockId = parseInt(btn.dataset.block, 10);
        this.selectBlock(blockId);
      });
    });

    // Hardware buttons on device chassis
    document.getElementById('hw-btn-prev')?.addEventListener('click', () => {
      this.cycleBlock(-1);
    });

    document.getElementById('hw-btn-next')?.addEventListener('click', () => {
      this.cycleBlock(1);
    });

    document.getElementById('hw-btn-select')?.addEventListener('click', () => {
      this.triggerHwConfirmation();
    });
  }

  cycleBlock(direction) {
    const blockIds = [7, 14, 23, 36, 45];
    const currentIndex = blockIds.indexOf(this.currentBlockId);
    let nextIndex = (currentIndex + direction + blockIds.length) % blockIds.length;
    this.selectBlock(blockIds[nextIndex]);
  }

  selectBlock(blockId) {
    if (this.currentBlockId === blockId && !this.isTyping) {
      // Re-trigger NFC pulse animation
      this.animateNfcPulse();
      return;
    }

    this.currentBlockId = blockId;
    this.readCount++;

    // Update active block button styling
    this.blockButtons.forEach(b => {
      if (parseInt(b.dataset.block, 10) === blockId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    this.animateNfcPulse();
    this.updateDisplay(true);
  }

  animateNfcPulse() {
    if (this.nfcGlowRing) {
      this.nfcGlowRing.style.animation = 'none';
      void this.nfcGlowRing.offsetWidth; // force reflow
      this.nfcGlowRing.style.animation = 'pulse-ring 0.6s ease-out 2';
    }

    // Gentle tactile haptic sound if supported or visual flash
    const chassis = document.getElementById('device-chassis');
    if (chassis) {
      chassis.style.borderColor = 'var(--amber-primary)';
      setTimeout(() => {
        chassis.style.borderColor = '#282e3b';
      }, 350);
    }
  }

  triggerHwConfirmation() {
    this.animateNfcPulse();
    const prevText = this.oledPromptText.textContent;
    this.oledPromptText.textContent = '>> ACTION CONFIRMED! PASS TO NEXT PLAYER <<';
    setTimeout(() => {
      this.updateDisplay(false);
    }, 1200);
  }

  updateDisplay(withTypewriter = true) {
    const catData = GAME_CATEGORIES[this.currentCategory] || GAME_CATEGORIES.party;
    const blockData = catData.blocks[this.currentBlockId] || catData.blocks[7];

    if (this.oledModeName) this.oledModeName.textContent = catData.name;
    if (this.oledBlockId) this.oledBlockId.textContent = `BLOCK #${this.currentBlockId < 10 ? '0' : ''}${this.currentBlockId} · ${blockData.tag.toUpperCase()}`;
    if (this.dockedAvatarText) this.dockedAvatarText.textContent = `Block #${this.currentBlockId} Detected`;
    if (this.oledReadCount) this.oledReadCount.textContent = this.readCount;

    const fullPrompt = `"${blockData.text}"`;

    // Telemetry capture
    analytics.trackSimulatorBlockTap(this.currentCategory, this.currentBlockId, blockData.text);

    if (!withTypewriter || !this.oledPromptText) {
      if (this.oledPromptText) this.oledPromptText.textContent = fullPrompt;
      return;
    }

    // Typewriter effect on OLED screen
    this.isTyping = true;
    this.oledPromptText.textContent = '';
    let index = 0;
    const speed = 16; // ms per character

    const typeChar = () => {
      if (index < fullPrompt.length) {
        this.oledPromptText.textContent += fullPrompt.charAt(index);
        index++;
        setTimeout(typeChar, speed);
      } else {
        this.isTyping = false;
      }
    };
    typeChar();
  }
}

export const simulator = new Simulator();
