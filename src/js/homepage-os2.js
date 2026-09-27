(() => {
  const GOLD = '#C9A961';
  const graph = {
    departments: [
      {id:'sales',label:'Sales',x:720,y:165},
      {id:'service',label:'Service',x:735,y:455},
      {id:'finance',label:'Finance',x:565,y:105},
      {id:'bdc',label:'BDC',x:500,y:510},
      {id:'marketing',label:'Marketing',x:275,y:470},
      {id:'billing',label:'Billing',x:355,y:105},
      {id:'accounting',label:'Accounting',x:205,y:210},
      {id:'used',label:'Used Cars',x:810,y:315},
      {id:'parts',label:'Parts',x:505,y:235}
    ],
    systems: [
      {id:'crm',label:'CRM',x:425,y:360,kind:'system'},
      {id:'dms',label:'DMS',x:580,y:330,kind:'system'},
      {id:'phone',label:'PHONE',x:335,y:375,kind:'system'},
      {id:'web',label:'WEBSITE',x:250,y:355,kind:'system'}
    ],
    edges: [
      ['marketing','web'],['web','crm'],['marketing','crm'],['phone','bdc'],['crm','bdc'],['crm','sales'],
      ['sales','finance'],['sales','used'],['finance','billing'],['billing','accounting'],
      ['sales','dms'],['finance','dms'],['service','dms'],['parts','dms'],['billing','dms'],['accounting','dms'],['used','dms'],
      ['service','parts']
    ],
    workflows: {
      'BDC-01': {
        id:'BDC-01',
        name:'Lead Response & Ownership',
        department:'BDC',
        from:'Marketing',
        to:'BDC',
        trigger:'New lead lands in CRM',
        failure:'Lead unassigned, or assigned and never contacted',
        cause:'Unowned',
        owner:'BDC manager',
        existingSystem:'CRM',
        kpi:'Minutes to first human contact',
        path:['marketing','crm','bdc'],
        interventionSet:[
          {type:'People',label:'Assign an explicit owner'},
          {type:'Process',label:'Define the ownership and escalation rule'},
          {type:'Configuration',label:'Use CRM routing / auto-assignment capability'}
        ]
      }
    }
  };

  const svg = document.getElementById('constellation');
  const workspace = document.querySelector('.workspace');
  const buttons = [...document.querySelectorAll('.mode[data-mode]')];
  const modeName = document.getElementById('modeName');
  const leftTitle = document.getElementById('leftTitle');
  const leftContent = document.getElementById('leftContent');
  const rightTitle = document.getElementById('rightTitle');
  const rightContent = document.getElementById('rightContent');
  const stageKicker = document.getElementById('stageKicker');
  const stageCaption = document.getElementById('stageCaption');
  const modeHint = document.getElementById('modeHint');
  const frameCopy = document.getElementById('frameCopy');
  const wf = graph.workflows['BDC-01'];

  const nodeMap = new Map([...graph.departments,...graph.systems].map(n=>[n.id,n]));
  const NS='http://www.w3.org/2000/svg';

  function el(name,attrs={}) {
    const n=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
    return n;
  }

  function renderBase(){
    svg.innerHTML='';
    const defs=el('defs');
    const marker=el('marker',{id:'arrow','viewBox':'0 0 10 10','refX':'8','refY':'5','markerWidth':'5','markerHeight':'5','orient':'auto-start-reverse'});
    marker.appendChild(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#6E747C'}));
    defs.appendChild(marker);svg.appendChild(defs);

    const edgeLayer=el('g',{class:'edges'});
    graph.edges.forEach(([a,b],i)=>{
      const A=nodeMap.get(a),B=nodeMap.get(b);
      const line=el('line',{x1:A.x,y1:A.y,x2:B.x,y2:B.y,class:'edge','data-a':a,'data-b':b,'data-index':i});
      edgeLayer.appendChild(line);
    });
    svg.appendChild(edgeLayer);

    const nodeLayer=el('g',{class:'nodes'});
    [...graph.departments,...graph.systems].forEach(n=>{
      const g=el('g',{class:'node '+(n.kind==='system'?'system':'department'),'data-id':n.id,transform:`translate(${n.x} ${n.y})`});
      const circle=el('circle',{r:n.kind==='system'?30:42});
      const text=el('text',{y:n.kind==='system'?4:5,'text-anchor':'middle'});
      text.textContent=n.label.toUpperCase();
      g.append(circle,text);
      if(n.kind!=='system'){
        const sub=el('text',{y:60,'text-anchor':'middle',class:'node-sub'});
        sub.textContent='DEPARTMENT';
        g.appendChild(sub);
      }
      nodeLayer.appendChild(g);
    });
    svg.appendChild(nodeLayer);

    const fx=el('g',{class:'fx'});
    const lead=el('circle',{r:'5',class:'lead-pulse'});
    const motion=el('animateMotion',{dur:'4.2s',repeatCount:'indefinite',path:'M 275 470 L 425 360 L 500 510'});
    lead.appendChild(motion);fx.appendChild(lead);svg.appendChild(fx);
  }

  function list(items){ return '<div class="stack">'+items.map(x=>`<div class="row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')+'</div>'; }
  function resetClasses(){
    svg.querySelectorAll('.node,.edge').forEach(n=>n.classList.remove('active','dim','fault','candidate','selected'));
    svg.querySelectorAll('.decision-orbit,.break-mark,.owner-slot').forEach(n=>n.remove());
  }
  function edge(a,b){return svg.querySelector(`.edge[data-a="${a}"][data-b="${b}"],.edge[data-a="${b}"][data-b="${a}"]`);}
  function node(id){return svg.querySelector(`.node[data-id="${id}"]`);}

  function isolatePath(){
    const activeNodes=new Set(wf.path);
    svg.querySelectorAll('.node').forEach(n=>n.classList.toggle('dim',!activeNodes.has(n.dataset.id)));
    svg.querySelectorAll('.edge').forEach(e=>{
      const a=e.dataset.a,b=e.dataset.b;
      const on=wf.path.some((id,i)=>i<wf.path.length-1 && ((wf.path[i]===a&&wf.path[i+1]===b)||(wf.path[i]===b&&wf.path[i+1]===a)));
      e.classList.toggle('active',on);e.classList.toggle('dim',!on);
    });
    wf.path.forEach(id=>node(id)?.classList.add('active'));
  }

  function addUnownedBreak(){
    const B=nodeMap.get('bdc');
    const g=el('g',{class:'break-mark',transform:`translate(${B.x-68} ${B.y-52})`});
    g.appendChild(el('line',{x1:'-11',y1:'-11',x2:'11',y2:'11'}));
    g.appendChild(el('line',{x1:'11',y1:'-11',x2:'-11',y2:'11'}));
    const t=el('text',{x:'18',y:'4'});t.textContent='UNOWNED';g.appendChild(t);svg.appendChild(g);
    edge('crm','bdc')?.classList.add('fault');
    const owner=el('g',{class:'owner-slot',transform:`translate(${B.x+76} ${B.y-34})`});
    owner.appendChild(el('circle',{r:'17'}));const tx=el('text',{x:'27',y:'4'});tx.textContent='OWNER —';owner.appendChild(tx);svg.appendChild(owner);
  }

  function addDecisionSet(){
    const B=nodeMap.get('bdc');
    const group=el('g',{class:'decision-orbit'});
    const spots=[
      {x:B.x+120,y:B.y-92,type:'People'},
      {x:B.x+170,y:B.y+5,type:'Process'},
      {x:B.x+94,y:B.y+94,type:'Configuration'}
    ];
    spots.forEach((s,i)=>{
      const g=el('g',{class:'decision-chip candidate',transform:`translate(${s.x} ${s.y})`,'data-intervention':s.type});
      g.appendChild(el('circle',{r:'25'}));
      const t=el('text',{'text-anchor':'middle',y:'4'});t.textContent=String(i+1).padStart(2,'0');g.appendChild(t);
      const l=el('text',{x:'36',y:'4'});l.textContent=s.type.toUpperCase();g.appendChild(l);
      group.appendChild(g);
    });
    svg.appendChild(group);
  }

  const states={
    system(){
      resetClasses();
      workspace.dataset.mode='system';
      modeName.textContent='SYSTEM';stageKicker.textContent='MODE 01 / SYSTEM';modeHint.textContent='STRUCTURE, NOT STORE DATA';
      frameCopy.textContent='This is the frame. The Diagnostic fills it in with your store.';
      leftTitle.textContent='DEALERSHIP FRAME';
      leftContent.innerHTML=list([
        ['DEPARTMENTS','9'],
        ['SHARED CORE','CRM / DMS'],
        ['VIEW','STRUCTURAL'],
        ['STORE DATA','NOT LOADED']
      ]);
      rightTitle.textContent='WHAT THIS SHOWS';
      rightContent.innerHTML='<p class="rail-copy">A dealership is not one system. It is departments, tools and handoffs operating as one business.</p><div class="callout">No performance state is implied here.</div>';
      stageCaption.innerHTML='<b>Same object.</b> Every later mode isolates or transforms this relationship graph.';
    },
    diagnose(){
      resetClasses();isolatePath();addUnownedBreak();
      workspace.dataset.mode='diagnose';
      modeName.textContent='DIAGNOSE';stageKicker.textContent='MODE 02 / DIAGNOSE';modeHint.textContent='WORKFLOW ISOLATION';
      frameCopy.textContent='The same dealership frame, narrowed to one workflow and one evidence-backed cause.';
      leftTitle.textContent=wf.id+' / '+wf.name.toUpperCase();
      leftContent.innerHTML=list([
        ['FROM',wf.from.toUpperCase()],
        ['TO',wf.to.toUpperCase()],
        ['TRIGGER',wf.trigger.toUpperCase()],
        ['SYSTEM',wf.existingSystem]
      ]);
      rightTitle.textContent='DIAGNOSTIC READOUT';
      rightContent.innerHTML=list([
        ['CAUSE',wf.cause.toUpperCase()],
        ['OWNER',wf.owner.toUpperCase()],
        ['FAILURE',wf.failure.toUpperCase()]
      ])+'<div class="callout gold">Where does work stop moving?</div>';
      stageCaption.innerHTML='<b>BDC-01 stays inside the SYSTEM graph.</b> Nothing is replaced; irrelevant relationships recede.';
    },
    decide(){
      resetClasses();isolatePath();addUnownedBreak();addDecisionSet();
      workspace.dataset.mode='decide';
      modeName.textContent='DECIDE';stageKicker.textContent='MODE 03 / DECIDE';modeHint.textContent='CAUSE CONSTRAINS / EVIDENCE SELECTS';
      frameCopy.textContent='UNOWNED does not determine the fix. Store evidence determines which intervention is appropriate.';
      leftTitle.textContent='INTERVENTION SET';
      leftContent.innerHTML=wf.interventionSet.map((x,i)=>`<button class="intervention" data-pick="${x.type}"><i>${String(i+1).padStart(2,'0')}</i><span><b>${x.type}</b><small>${x.label}</small></span></button>`).join('');
      rightTitle.textContent='DECISION RULE';
      rightContent.innerHTML='<p class="rail-copy">The cause narrows the question. It does not answer it.</p>'+list([
        ['CAUSE',wf.cause.toUpperCase()],
        ['EXISTING SYSTEM',wf.existingSystem],
        ['SELECTION','REQUIRES STORE EVIDENCE']
      ])+'<div class="decision-result" id="decisionResult">Choose an intervention to preview the decision state.</div>';
      stageCaption.innerHTML='<b>Same break, multiple valid fixes.</b> DECIDE exists because the correct intervention depends on the dealership.';
      setTimeout(bindInterventions,0);
    }
  };

  function bindInterventions(){
    document.querySelectorAll('.intervention').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.intervention').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      const pick=btn.dataset.pick;
      svg.querySelectorAll('.decision-chip').forEach(c=>c.classList.toggle('selected',c.dataset.intervention===pick));
      const item=wf.interventionSet.find(x=>x.type===pick);
      const out=document.getElementById('decisionResult');
      if(out) out.innerHTML=`<span>PREVIEWED INTERVENTION</span><b>${item.type.toUpperCase()}</b><small>${item.label}</small><em>Prototype only — not a recommendation for an unknown store.</em>`;
    }));
  }

  function setMode(name,fromUser=false){
    states[name]();
    buttons.forEach(b=>b.classList.toggle('active',b.dataset.mode===name));
    history.replaceState(null,'','#'+name);
    if(fromUser) document.querySelector('.workspace')?.focus?.();
  }

  buttons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode,true)));
  renderBase();
  const initial=['system','diagnose','decide'].includes(location.hash.slice(1))?location.hash.slice(1):'system';
  setMode(initial);

  if(initial==='system'){
    setTimeout(()=>{
      const d=document.querySelector('.mode[data-mode="diagnose"]');
      if(d && document.querySelector('.mode.active')?.dataset.mode==='system') d.classList.add('invite');
    },4200);
  }
})();