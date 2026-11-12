import React from 'react';

// Plain description of the game and the hardware. Only facts we have confirmed.
const STEPS = [
  { n: '01', t: 'Stack', d: 'A wooden tower of standard size blocks, with Jeemu on every one.' },
  { n: '02', t: 'Pull', d: 'Slide a block out the way you always have. Each one carries an NFC chip.' },
  { n: '03', t: 'Tap', d: 'Touch the block to the Jeemu mark on the base. The reader sits just behind it.' },
  { n: '04', t: 'Answer', d: 'A question appears on the screen. Play it, then place the block back on top.' }
];

const FACTS = [
  ['SCREEN', '320 x 240 pixel display'],
  ['BLOCKS', 'Wood, standard size'],
  ['READER', 'NFC, in the base'],
  ['APP', 'In development, for choosing question packs and writing your own']
];

export default function HowItWorks() {
  return (
    <section className="section-container hiw" id="how">
      <div className="section-header">
        <div className="px-label">HOW IT PLAYS</div>
        <h2 className="section-title">Four steps, one tower.</h2>
      </div>
      <ol className="hiw-steps">
        {STEPS.map((s) => (
          <li key={s.n} className="hiw-step">
            <span className="hiw-n">{s.n}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
      <h3 className="hiw-sub">Specs</h3>
      <dl className="hiw-facts">
        {FACTS.map(([k, v]) => (<div key={k}><dt className="px-label">{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <div className="hiw-box">
        <div className="px-label">WHAT'S IN THE BOX</div>
        <p>The Jeemu base, NFC blocks, a charging cable, and a sleeve with instructions.</p>
      </div>
    </section>
  );
}
