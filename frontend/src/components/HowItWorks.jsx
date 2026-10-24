import React from 'react';

// Plain description of the game and the hardware. Only facts we have confirmed.
const STEPS = [
  { n: '01', t: 'Stack', d: 'A wooden tower of standard-size blocks, with Jeemu on the side of every block.' },
  { n: '02', t: 'Pull', d: 'Slide a block out like you normally would. Each one has an NFC chip inside.' },
  { n: '03', t: 'Tap', d: 'Hold the block flat against the Jeemu name on the side of the base. The NFC reader is behind it.' },
  { n: '04', t: 'Answer', d: 'The screen shows a question. Answer it, then put the block back on top.' }
];

const FACTS = [
  ['SCREEN', '320 x 240 pixel display'],
  ['BLOCKS', 'Wood, standard size'],
  ['READER', 'NFC, in the base'],
  ['APP', 'In development, for picking and writing games']
];

export default function HowItWorks() {
  return (
    <section className="section-container hiw" id="how">
      <div className="section-header">
        <div className="px-label">HOW IT PLAYS</div>
        <h2 className="section-title">Four steps, one tower.</h2>
        <p className="section-desc">You already know how to stack a tower. The base reads the block and the screen does the asking.</p>
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
      <dl className="hiw-facts">
        {FACTS.map(([k, v]) => (<div key={k}><dt className="px-label">{k}</dt><dd>{v}</dd></div>))}
      </dl>
    </section>
  );
}
