// Which version of the night a visitor gets.
//   MOBILE: phones. Pre-baked portrait frames crossfading (MobileStage.jsx, frames from scripts/web/capture_mobile.cjs):
//           no live 3D compositing, which phones can't hold in memory or keep smooth.
//   SMALL:  a small screen running the full engine anyway (?full): the lighter assets and look.
//   CAPTURE: ?capture, the full engine with the words hidden, for baking the phone frames.
const QS = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
export const CAPTURE = QS.has('capture');
const phone = typeof window !== 'undefined' && Math.min(window.screen.width, window.screen.height) < 600;
export const SMALL = phone && !CAPTURE;
export const MOBILE = SMALL && !QS.has('full');
if (typeof document !== 'undefined') {
  if (SMALL) document.documentElement.classList.add('tn-lite');
  if (CAPTURE) document.documentElement.classList.add('tn-capture');
}
