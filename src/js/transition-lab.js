(() => {
  const section = document.getElementById('modeShift');
  if (!section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function update(){
    const r = section.getBoundingClientRect();
    const total = Math.max(1, section.offsetHeight - innerHeight);
    const p = Math.max(0, Math.min(1, -r.top / total));
    section.style.setProperty('--p', p.toFixed(4));

    const state = section.querySelector('.mode-state');
    if (state) state.textContent = p < .48 ? 'SYSTEM / CONNECTED' : 'DIAGNOSE / TRACE ACTIVE';
  }

  if (reduced) {
    section.style.setProperty('--p', '1');
    return;
  }
  update();
  addEventListener('scroll', update, {passive:true});
  addEventListener('resize', update);
})();