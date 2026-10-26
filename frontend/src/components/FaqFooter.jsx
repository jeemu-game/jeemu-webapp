import React, { useState } from 'react';

const FAQS = [
  { q: 'What is Jeemu?', a: 'A tower game where every wooden block carries a hidden NFC chip. Pull a block, tap it on the base, and the screen shows the prompt for that block in the game you picked.' },
  { q: 'Do I need my phone while playing?', a: 'No. You use the companion app to choose or edit a game and send it to the base. Once it is loaded, the base runs the game on its own. The app is still in development.' },
  { q: 'Can I make my own games?', a: 'That is the plan. In the app you will be able to write your own prompts, start from presets, and share games with other players. This is still being built.' },
  { q: 'When does it launch, and what does it cost?', a: 'We launch on Kickstarter in November. The early bird price is $89.99 USD.' },
  { q: 'What do early-bird backers get?', a: 'The $89.99 early-bird price and a premium Jeemu bag that your set fits in. Joining the waitlist gets you first word when the campaign opens.' },
  { q: 'What are the blocks like?', a: 'Standard-size wooden blocks, each branded with the Jeemu name.' }
];

export default function FaqFooter() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <section className="section-container" id="faq">
        <div className="section-header">
          <div className="px-label">FAQ</div>
          <h2 className="section-title">Questions</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div key={f.q} className="faq-item">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="faq-trigger" aria-expanded={open === i}>
                <span>{f.q}</span><b aria-hidden="true">{open === i ? '−' : '+'}</b>
              </button>
              {open === i && <div className="faq-content">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-container">
          <div className="nb-brand"><img src={`${import.meta.env.BASE_URL}story/frog-pixel.png`} alt="" className="px-frog" /><span>JEEMU</span></div>
          <nav className="footer-links" aria-label="Footer">
            <a href="#how">How it plays</a>
            <a href="#waitlist">Waitlist</a>
            <a href="#journey">Our story</a>
            <a href="#team">Team</a>
            <a href="#faq">FAQ</a>
            <a href="/admin" style={{ opacity: 0.6, fontSize: '0.85em' }}>Team Portal</a>
          </nav>
          <p className="footer-legal">
            © {new Date().getFullYear()} Jeemu. Made in Shanghai. Jeemu is an independent game and is not affiliated with Kickstarter. Launch date and pricing may change before the campaign goes live.
          </p>
        </div>
      </footer>
    </>
  );
}
