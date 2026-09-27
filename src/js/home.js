(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stories = [...document.querySelectorAll('.handoff-story')];
  const cards = [...document.querySelectorAll('.flow-card')];
  if (stories.length && !reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const i = Number(entry.target.dataset.flow);
        stories.forEach((el,n) => el.classList.toggle('active', n === i));
        cards.forEach((el,n) => el.classList.toggle('active', n === i));
      });
    }, {rootMargin:'-35% 0px -45% 0px', threshold:0});
    stories.forEach(s => io.observe(s));
  }

  const copy = {
    process: ['SIGNAL','HANDOFF','ACTION','PROCESS / Remove unnecessary steps and clarify the handoff.'],
    people: ['SIGNAL','OWNER','ACTION','PEOPLE / Clarify ownership, responsibility and escalation.'],
    configuration: ['SYSTEM','ROUTING','ACTION','CONFIGURATION / Make the systems you already own work better.'],
    automation: ['TRIGGER','RULE','ACTION','AUTOMATION / Connect predictable steps and remove repetitive work.'],
    ai: ['INPUT','CLASSIFY','ACTION','AI / Add capability where it meaningfully improves the workflow.']
  };
  const tabs = [...document.querySelectorAll('.intervention-tabs button')];
  const stage = document.getElementById('interventionStage');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    const v = copy[tab.dataset.mode];
    const nodes = stage.querySelectorAll('.int-node');
    nodes[0].textContent=v[0]; nodes[1].textContent=v[1]; nodes[2].textContent=v[2];
    stage.querySelector('.int-caption').textContent=v[3];
  }));

  const method = [...document.querySelectorAll('.method-track article')];
  if (method.length) {
    const io2 = new IntersectionObserver(entries => entries.forEach(e => {
      if(e.isIntersecting) e.target.classList.add('seen');
    }), {threshold:.35});
    method.forEach(m => io2.observe(m));
  }

  if (!reduced) {
    const hero = document.querySelector('.home-hero-copy');
    const network = document.querySelector('.network-shell');
    if (hero && network) {
      hero.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:800,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
      network.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:1000,delay:250,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    }
  }
})();