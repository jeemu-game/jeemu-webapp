import React from 'react';

export default function MarqueeStrip({ variant = 'specs' }) {
  const specsItems = [
    { icon: '⚡', text: '45 Cryptographic NFC Blocks', tag: '13.56MHz' },
    { icon: '🌲', text: 'European Solid Beechwood', tag: 'Matte Beeswax' },
    { icon: '🚫', text: '100% Phone-Free During Play', tag: 'Zero Screens' },
    { icon: '⏱️', text: 'Sub-80ms Tag Detection', tag: 'Instant Response' },
    { icon: '🔋', text: '12-Hour Rechargeable Battery', tag: 'USB-C Power' },
    { icon: '🖥️', text: 'Panoramic High-Contrast IPS', tag: 'Full Color' },
    { icon: '✨', text: "Free Gold-Stamped Founder's Block", tag: 'Batch 01' },
    { icon: '🛡️', text: '100% Refundable $1 Deposit', tag: 'Lowest $89' }
  ];

  const quotesItems = [
    { icon: '💬', text: '"The tactile snap of the blocks on the reader dock is pure magic."', tag: '— Tabletop Daily' },
    { icon: '🎉', text: '"Finally, a game night where nobody is staring down at iPhones."', tag: '— Backer #142' },
    { icon: '🤖', text: '"Generated 45 custom anniversary prompts in 8 seconds."', tag: '— Playtester Sarah' },
    { icon: '🪵', text: '"The European beechwood finish with beeswax feels extraordinary."', tag: '— Craft Review' },
    { icon: '🏆', text: '"Locked in my $1 VIP reservation in 5 seconds."', tag: '— Early Backer #409' }
  ];

  const items = variant === 'quotes' ? quotesItems : specsItems;

  return (
    <div className="marquee-wrap" aria-label="Jeemu Highlights Ticker">
      <div className="marquee-track">
        {/* Set 1 */}
        {items.map((item, idx) => (
          <div key={`s1-${idx}`} className="marquee-item">
            <span className="marquee-icon">{item.icon}</span>
            <span>{item.text}</span>
            <span className="marquee-tag">{item.tag}</span>
          </div>
        ))}

        {/* Set 2 (Duplicate for smooth infinite seamless loop) */}
        {items.map((item, idx) => (
          <div key={`s2-${idx}`} className="marquee-item">
            <span className="marquee-icon">{item.icon}</span>
            <span>{item.text}</span>
            <span className="marquee-tag">{item.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
