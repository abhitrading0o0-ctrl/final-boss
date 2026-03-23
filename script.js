'use strict';

/* ══════════════════════════════════════════════════
   1. STAR CANVAS — animated twinkling stars
══════════════════════════════════════════════════ */
(function(){
  var canvas = document.getElementById('star-canvas');
  var ctx    = canvas.getContext('2d');
  var stars  = [];

  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    buildStars();
  }

  function buildStars(){
    stars = [];
    var count = Math.min(220, Math.floor(window.innerWidth * 0.18));
    for(var i=0;i<count;i++){
      stars.push({
        x:     Math.random()*canvas.width,
        y:     Math.random()*canvas.height,
        r:     Math.random()*1.3+0.2,
        base:  Math.random()*0.45+0.08,
        /* occasional sakura-tinted stars */
        pink:  Math.random() < 0.08,
        spd:   Math.random()*5000+2500,
        ph:    Math.random()*Math.PI*2
      });
    }
  }

  function draw(t){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var i=0;i<stars.length;i++){
      var s  = stars[i];
      var op = s.base*(0.35+0.65*Math.abs(Math.sin((t%s.spd)/s.spd*Math.PI*2+s.ph)));
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = s.pink
        ? 'rgba(255,183,197,'+op.toFixed(3)+')'
        : 'rgba(255,255,255,'+op.toFixed(3)+')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();


/* ══════════════════════════════════════════════════
   2. GLOBAL SAKURA PETALS (subtle, always visible)
══════════════════════════════════════════════════ */
(function(){
  var wrap = document.getElementById('petal-canvas');
  if(!wrap) return;

  var SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">'
    +'<path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>'
    +'<path d="M12 22a3 3 0 0 0 3-3v-1a3 3 0 0 0-6 0v1a3 3 0 0 0 3 3z"/>'
    +'<path d="M2 12a3 3 0 0 0 3 3h1a3 3 0 0 0 0-6H5a3 3 0 0 0-3 3z"/>'
    +'<path d="M22 12a3 3 0 0 0-3-3h-1a3 3 0 0 0 0 6h1a3 3 0 0 0 3-3z"/>'
    +'</svg>';

  for(var i=0;i<18;i++){
    var p   = document.createElement('div');
    var sz  = Math.random()*10+6;
    var lft = Math.random()*100;
    var dur = Math.random()*20+15;
    var del = Math.random()*25;
    var op  = Math.random()*0.12+0.04;

    p.style.cssText =
      'position:absolute;top:-5%;left:'+lft+'vw;'
      +'width:'+sz+'px;height:'+sz+'px;'
      +'color:rgba(255,183,197,'+op+');'
      +'mix-blend-mode:screen;pointer-events:none;'
      +'animation:rFall '+dur+'s linear -'+del+'s infinite;';
    p.innerHTML = SVG;
    wrap.appendChild(p);
  }
})();


/* ══════════════════════════════════════════════════
   3. ENTRY SCREEN → STORY
══════════════════════════════════════════════════ */
(function(){
  var entry     = document.getElementById('entry');
  var btn       = document.getElementById('e-btn');
  var pageStory = document.getElementById('page-story');
  var nav       = document.getElementById('main-nav');
  var hint      = document.getElementById('scroll-hint');

  btn.addEventListener('click', function(){
    /* Fade entry out */
    entry.classList.add('out');

    /* Show story + nav immediately behind fade */
    pageStory.style.display = 'block';
    nav.style.display       = 'flex';
    if(hint) hint.style.opacity = '1';

    /* Remove entry after transition */
    entry.addEventListener('transitionend', function h(){
      entry.removeEventListener('transitionend',h);
      entry.style.display = 'none';
    });

    /* Trigger story card observations */
    setTimeout(observeCards, 250);

    /* Animate opening lines stagger */
    setTimeout(animateOpeningLines, 400);

    /* Start audio */
    startAudio('enter');
  });
})();


/* ══════════════════════════════════════════════════
   4. AUDIO — built-in peaceful background music + UI sound effects
══════════════════════════════════════════════════ */
var audioBtn       = document.getElementById('audio-btn');
var isPlaying      = false;
var bgTargetVolume = 0.14;
var sfxCtx         = null;
var bgState        = null;
var bgDestroyTimer = null;

function updateAudioButtonState(){
  if(!audioBtn) return;
  audioBtn.classList.toggle('playing', isPlaying);
  audioBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
}

function ensureAudioContext(){
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if(!AudioContextClass) return null;

  if(!sfxCtx){
    sfxCtx = new AudioContextClass();
  }

  return sfxCtx;
}

function withUnlockedAudio(fn){
  var ctx = ensureAudioContext();
  if(!ctx) return;

  if(ctx.state === 'suspended'){
    ctx.resume().then(function(){
      fn(ctx);
    }).catch(function(){});
  } else {
    fn(ctx);
  }
}

function scheduleTone(ctx, destination, startAt, cfg){
  var osc    = ctx.createOscillator();
  var gain   = ctx.createGain();
  var filter = ctx.createBiquadFilter();
  var endAt  = startAt + cfg.duration;

  osc.type = cfg.wave || 'sine';
  osc.frequency.setValueAtTime(cfg.from, startAt);
  osc.frequency.exponentialRampToValueAtTime(cfg.to || cfg.from, endAt);

  filter.type = cfg.filterType || 'lowpass';
  filter.frequency.setValueAtTime(cfg.cutoff || 2600, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(cfg.peak || 0.03, startAt + (cfg.attack || 0.03));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(startAt);
  osc.stop(endAt + 0.05);
}

function playSfxWithContext(ctx, kind){
  var now = ctx.currentTime + 0.01;
  var patterns = {
    enter: [
      { delay: 0.00, from: 392.00, to: 523.25, duration: 0.70, peak: 0.032, wave: 'sine', cutoff: 2600 },
      { delay: 0.10, from: 523.25, to: 659.25, duration: 0.85, peak: 0.024, wave: 'triangle', cutoff: 3000 }
    ],
    nav: [
      { delay: 0.00, from: 329.63, to: 392.00, duration: 0.30, peak: 0.020, wave: 'triangle', cutoff: 2400 }
    ],
    tap: [
      { delay: 0.00, from: 440.00, to: 554.37, duration: 0.24, peak: 0.022, wave: 'sine', cutoff: 2500 }
    ],
    bloom: [
      { delay: 0.00, from: 261.63, to: 329.63, duration: 1.00, peak: 0.022, wave: 'sine', cutoff: 1900 },
      { delay: 0.08, from: 392.00, to: 523.25, duration: 0.78, peak: 0.017, wave: 'triangle', cutoff: 2400 }
    ],
    mute: [
      { delay: 0.00, from: 392.00, to: 293.66, duration: 0.34, peak: 0.018, wave: 'triangle', cutoff: 1800 }
    ]
  };

  var tones = patterns[kind] || patterns.tap;
  tones.forEach(function(tone){
    scheduleTone(ctx, ctx.destination, now + tone.delay, tone);
  });
}

function playSfx(kind, allowWhenSilent){
  if(!allowWhenSilent && !isPlaying) return;

  withUnlockedAudio(function(ctx){
    playSfxWithContext(ctx, kind);
  });
}

function clearBackgroundDestroy(){
  if(bgDestroyTimer){
    clearTimeout(bgDestroyTimer);
    bgDestroyTimer = null;
  }
}

function playAmbientBell(state, freq, delay, peak, duration){
  var ctx      = state.ctx;
  var startAt  = ctx.currentTime + (delay || 0);
  var endAt    = startAt + duration;
  var bellGain = ctx.createGain();
  var bellLP   = ctx.createBiquadFilter();
  var lowOsc   = ctx.createOscillator();
  var highOsc  = ctx.createOscillator();

  lowOsc.type = 'sine';
  highOsc.type = 'triangle';
  lowOsc.frequency.setValueAtTime(freq, startAt);
  highOsc.frequency.setValueAtTime(freq * 2, startAt);
  highOsc.detune.setValueAtTime(5, startAt);

  bellLP.type = 'lowpass';
  bellLP.frequency.setValueAtTime(2400, startAt);

  bellGain.gain.setValueAtTime(0.0001, startAt);
  bellGain.gain.exponentialRampToValueAtTime(peak, startAt + 0.05);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  lowOsc.connect(bellLP);
  highOsc.connect(bellLP);
  bellLP.connect(bellGain);
  bellGain.connect(state.master);

  lowOsc.start(startAt);
  highOsc.start(startAt);
  lowOsc.stop(endAt + 0.05);
  highOsc.stop(endAt + 0.05);
}

function scheduleAmbientPhrase(state, leadDelay){
  var notes = [523.25, 659.25, 587.33, 493.88, 440.00, 392.00];
  var root  = notes[state.noteIndex % notes.length];
  var echo  = notes[(state.noteIndex + 2) % notes.length] / 2;

  playAmbientBell(state, root, leadDelay || 0, 0.024, 1.95);
  playAmbientBell(state, echo, (leadDelay || 0) + 0.62, 0.012, 1.65);

  state.noteIndex++;
}

function stopBackgroundNodes(state){
  if(!state) return;

  if(state.noteTimer){
    clearInterval(state.noteTimer);
    state.noteTimer = null;
  }

  state.voices.forEach(function(voice){
    try { voice.osc.stop(); } catch(e) {}
    try { voice.osc.disconnect(); } catch(e) {}
    try { voice.gain.disconnect(); } catch(e) {}
  });

  ['filterLfo', 'padLfo'].forEach(function(key){
    if(!state[key]) return;
    try { state[key].stop(); } catch(e) {}
    try { state[key].disconnect(); } catch(e) {}
  });

  ['filterDepth', 'padDepth', 'padFilter', 'padMix', 'master'].forEach(function(key){
    if(!state[key]) return;
    try { state[key].disconnect(); } catch(e) {}
  });
}

function buildBackground(ctx){
  if(bgState) return bgState;

  var master     = ctx.createGain();
  var padFilter  = ctx.createBiquadFilter();
  var padMix     = ctx.createGain();
  var filterLfo  = ctx.createOscillator();
  var filterDepth = ctx.createGain();
  var padLfo     = ctx.createOscillator();
  var padDepth   = ctx.createGain();
  var voices     = [];
  var voiceCfgs  = [
    { type: 'sine',     freq: 174.61, gain: 0.16, detune: -5 },
    { type: 'triangle', freq: 261.63, gain: 0.08, detune: 4 },
    { type: 'sine',     freq: 392.00, gain: 0.045, detune: 2 }
  ];

  master.gain.value = 0;
  master.connect(ctx.destination);

  padFilter.type = 'lowpass';
  padFilter.frequency.value = 880;
  padFilter.Q.value = 0.6;
  padFilter.connect(padMix);

  padMix.gain.value = 0.58;
  padMix.connect(master);

  voiceCfgs.forEach(function(cfg){
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = cfg.type;
    osc.frequency.value = cfg.freq;
    osc.detune.value = cfg.detune || 0;
    gain.gain.value = cfg.gain;

    osc.connect(gain);
    gain.connect(padFilter);
    osc.start();

    voices.push({ osc: osc, gain: gain });
  });

  filterLfo.type = 'sine';
  filterLfo.frequency.value = 0.05;
  filterDepth.gain.value = 220;
  filterLfo.connect(filterDepth);
  filterDepth.connect(padFilter.frequency);
  filterLfo.start();

  padLfo.type = 'sine';
  padLfo.frequency.value = 0.08;
  padDepth.gain.value = 0.04;
  padLfo.connect(padDepth);
  padDepth.connect(padMix.gain);
  padLfo.start();

  bgState = {
    ctx: ctx,
    master: master,
    padFilter: padFilter,
    padMix: padMix,
    filterLfo: filterLfo,
    filterDepth: filterDepth,
    padLfo: padLfo,
    padDepth: padDepth,
    voices: voices,
    noteTimer: null,
    noteIndex: 0
  };

  scheduleAmbientPhrase(bgState, 0.35);
  bgState.noteTimer = setInterval(function(){
    scheduleAmbientPhrase(bgState, 0);
  }, 2600);

  return bgState;
}

function startBackgroundMusic(ctx){
  clearBackgroundDestroy();

  var state = buildBackground(ctx);
  var now = ctx.currentTime;

  state.master.gain.cancelScheduledValues(now);
  state.master.gain.setValueAtTime(state.master.gain.value, now);
  state.master.gain.linearRampToValueAtTime(bgTargetVolume, now + 2.4);
}

function stopBackgroundMusic(){
  if(!bgState) return;

  var state = bgState;
  var now = state.ctx.currentTime;

  clearBackgroundDestroy();
  state.master.gain.cancelScheduledValues(now);
  state.master.gain.setValueAtTime(state.master.gain.value, now);
  state.master.gain.linearRampToValueAtTime(0, now + 0.8);

  bgDestroyTimer = setTimeout(function(){
    stopBackgroundNodes(state);
    if(bgState === state){
      bgState = null;
    }
  }, 900);
}

function startAudio(startEffect){
  if(isPlaying) return;

  withUnlockedAudio(function(ctx){
    isPlaying = true;
    updateAudioButtonState();
    startBackgroundMusic(ctx);
    if(startEffect) playSfxWithContext(ctx, startEffect);
  });
}

function stopAudio(){
  if(!isPlaying) return;

  playSfx('mute', true);
  isPlaying = false;
  updateAudioButtonState();
  stopBackgroundMusic();
}

['pointerdown', 'touchstart'].forEach(function(evtName){
  document.addEventListener(evtName, function unlockOnce(){
    withUnlockedAudio(function(){});
  }, { passive: true, once: true });
});

if(audioBtn){
  audioBtn.addEventListener('click', function(){
    if(isPlaying){
      stopAudio();
    } else {
      startAudio('enter');
    }
  });
}


/* ══════════════════════════════════════════════════
   5. NAVIGATION
══════════════════════════════════════════════════ */
var curPage = 'story';
var pageMap = {
  story:     document.getElementById('page-story'),
  reminders: document.getElementById('page-reminders'),
  contact:   document.getElementById('page-contact'),
  credits:   document.getElementById('page-credits'),
};

document.querySelectorAll('.nav-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var pg = btn.dataset.page;
    if(pg === curPage) return;

    playSfx('nav');

    /* Hide current */
    if(pageMap[curPage]) pageMap[curPage].style.display = 'none';
    /* Show new */
    if(pageMap[pg]) pageMap[pg].style.display = 'block';

    /* Update nav active */
    document.querySelectorAll('.nav-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.page===pg);
    });

    window.scrollTo({top:0,behavior:'smooth'});
    curPage = pg;

    /* Page-specific inits */
    if(pg==='reminders'){ buildRemPetals(); observeQuoteCards(); }
    if(pg==='story'){ observeCards(); }
    if(pg==='contact'){
      /* Reset contact to idle on visit */
      showContactState('idle');
    }
    if(pg==='credits'){ initCredits(); }
  });
});


/* ══════════════════════════════════════════════════
   6. MOUNTAIN PARALLAX
══════════════════════════════════════════════════ */
(function(){
  var mt = document.getElementById('mountain-wrap');
  window.addEventListener('mousemove', function(e){
    var x = (e.clientX/window.innerWidth  - 0.5) * -9;
    var y = (e.clientY/window.innerHeight - 0.5) * -6;
    mt.style.transform = 'translate('+x+'px,'+y+'px)';
  });
})();


/* ══════════════════════════════════════════════════
   7. SCROLL HINT — hide on scroll
══════════════════════════════════════════════════ */
(function(){
  var hint   = document.getElementById('scroll-hint');
  var hidden = false;
  window.addEventListener('scroll', function(){
    if(!hidden && window.scrollY > 70){
      hint.style.opacity = '0';
      hidden = true;
    }
  }, {passive:true});
})();


/* ══════════════════════════════════════════════════
   8. STORY CARD SCROLL REVEAL
══════════════════════════════════════════════════ */
var cardsObserved = false;

function observeCards(){
  var cards = document.querySelectorAll('.reveal-card');

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var card = en.target;
      card.classList.add('vis');
      fireCardChildren(card);
      io.unobserve(card);
    });
  },{threshold:0.1, rootMargin:'-40px 0px'});

  cards.forEach(function(c){ io.observe(c); });
}

function fireCardChildren(card){
  /* Quote bar items */
  card.querySelectorAll('.qi').forEach(function(el,i){
    setTimeout(function(){ el.classList.add('vis'); }, 300+i*420);
  });
  /* Blur reveal */
  var br = card.querySelector('.blur-reveal');
  if(br) setTimeout(function(){ br.classList.add('vis'); }, 600);
  /* Massive text */
  var m = card.querySelector('.massive');
  if(m) setTimeout(function(){ m.classList.add('vis'); }, 1200);
  /* Take care text */
  var tc = card.querySelector('#tc-text');
  if(tc) setTimeout(function(){ tc.classList.add('vis'); }, 400);
}


/* ══════════════════════════════════════════════════
   9. OPENING LINES STAGGER (Section 1)
══════════════════════════════════════════════════ */
function animateOpeningLines(){
  var lines = document.querySelectorAll('.ol');
  lines.forEach(function(l,i){
    setTimeout(function(){ l.classList.add('vis'); }, 800+i*320);
  });
}


/* ══════════════════════════════════════════════════
   10. START READING BUTTON
══════════════════════════════════════════════════ */
(function(){
  var btn = document.getElementById('start-btn');
  if(!btn) return;
  btn.addEventListener('click', function(){
    playSfx('tap');
    var s2 = document.getElementById('s2');
    if(s2) s2.scrollIntoView({behavior:'smooth'});
  });
})();


/* ══════════════════════════════════════════════════
   11. SCROLL LISTENER (backup for IntersectionObserver)
══════════════════════════════════════════════════ */
(function(){
  var ticking = false;
  window.addEventListener('scroll', function(){
    if(!ticking){
      requestAnimationFrame(function(){
        /* Re-check any unvisited cards */
        document.querySelectorAll('.reveal-card:not(.vis)').forEach(function(c){
          var r = c.getBoundingClientRect();
          if(r.top < window.innerHeight * 0.88){
            c.classList.add('vis');
            fireCardChildren(c);
          }
        });
        ticking = false;
      });
      ticking = true;
    }
  }, {passive:true});
})();


/* ══════════════════════════════════════════════════
   12. REMINDERS PAGE PETALS
══════════════════════════════════════════════════ */
var remPetalsBuilt = false;

function buildRemPetals(){
  if(remPetalsBuilt) return;
  remPetalsBuilt = true;

  var wrap = document.getElementById('rem-petals');
  if(!wrap) return;

  var SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">'
    +'<path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>'
    +'<path d="M12 22a3 3 0 0 0 3-3v-1a3 3 0 0 0-6 0v1a3 3 0 0 0 3 3z"/>'
    +'<path d="M2 12a3 3 0 0 0 3 3h1a3 3 0 0 0 0-6H5a3 3 0 0 0-3 3z"/>'
    +'<path d="M22 12a3 3 0 0 0-3-3h-1a3 3 0 0 0 0 6h1a3 3 0 0 0 3-3z"/>'
    +'</svg>';

  for(var i=0;i<35;i++){
    var p   = document.createElement('div');
    p.className = 'rpetal';
    var sz  = Math.random()*14+7;
    var lft = Math.random()*100;
    var dur = Math.random()*16+10;
    var del = Math.random()*22;
    var op  = Math.random()*0.18+0.06;

    p.style.cssText =
      'left:'+lft+'vw;width:'+sz+'px;height:'+sz+'px;'
      +'color:rgba(255,183,197,'+op+');'
      +'animation-duration:'+dur+'s;animation-delay:-'+del+'s;';
    p.innerHTML = SVG;
    wrap.appendChild(p);
  }
}


/* ══════════════════════════════════════════════════
   13. QUOTE CARDS REVEAL — Reminders
══════════════════════════════════════════════════ */
function observeQuoteCards(){
  var cards = document.querySelectorAll('.reveal-qc');

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var idx = Array.from(cards).indexOf(en.target);
      /* Stagger by column position */
      var delay = (idx % 2) * 110;
      var card  = en.target;
      setTimeout(function(){ card.classList.add('vis'); }, delay);
      io.unobserve(card);
    });
  },{threshold:0.08, rootMargin:'-15px 0px'});

  cards.forEach(function(c){ io.observe(c); });
}


/* ══════════════════════════════════════════════════
   14. BLOOM / BREATH BUTTON
══════════════════════════════════════════════════ */
(function(){
  var btn   = document.getElementById('bloom-btn');
  var label = document.getElementById('bloom-lbl');
  var active = false;
  if(!btn) return;

  function on(){
    if(active) return;
    active = true;
    btn.classList.add('on');
    label.textContent = 'Bloom…';
    playSfx('bloom');
  }

  function off(){
    if(!active) return;
    active = false;
    btn.classList.remove('on');
    label.textContent = 'Hold to Bloom';
  }

  btn.addEventListener('mousedown',   on);
  btn.addEventListener('touchstart',  on,  {passive:true});
  btn.addEventListener('mouseup',     off);
  btn.addEventListener('mouseleave',  off);
  btn.addEventListener('touchend',    off);
  btn.addEventListener('touchcancel', off);
})();


/* ══════════════════════════════════════════════════
   15. CONTACT PAGE STATE MACHINE
══════════════════════════════════════════════════ */
var QUESTIONS = [
  'Are you feeling peaceful right now?',
  'Is this a good time for us to talk?',
  'Do you feel comfortable reaching out?',
];
var qIdx = 0;

var ctPanels = {
  idle:    document.getElementById('ct-idle'),
  qs:      document.getElementById('ct-qs'),
  wa:      document.getElementById('ct-whatsapp'),
  maybe:   document.getElementById('ct-maybe-panel'),
  read:    document.getElementById('ct-read-panel'),
};

function showContactState(name){
  Object.keys(ctPanels).forEach(function(k){
    if(ctPanels[k]) ctPanels[k].style.display = 'none';
  });
  if(ctPanels[name]){
    ctPanels[name].style.display = 'block';
    /* Re-trigger animation */
    if(ctPanels[name].classList.contains('ct-panel')){
      ctPanels[name].style.animation = 'none';
      void ctPanels[name].offsetWidth;
      ctPanels[name].style.animation = '';
    }
  }
}

function setQuestion(){
  var cnt = document.getElementById('q-count');
  var txt = document.getElementById('q-text');
  if(cnt) cnt.textContent = 'Question '+(qIdx+1)+' of '+QUESTIONS.length;
  if(txt) txt.textContent = QUESTIONS[qIdx];
}

/* WhatsApp → questions */
var bWa = document.getElementById('ct-wa');
if(bWa) bWa.addEventListener('click', function(){
  playSfx('tap');
  qIdx=0; setQuestion(); showContactState('qs');
});

/* Maybe */
var bMaybe = document.getElementById('ct-maybe');
if(bMaybe) bMaybe.addEventListener('click', function(){
  playSfx('tap');
  showContactState('maybe');
});

/* Read */
var bRead = document.getElementById('ct-read');
if(bRead) bRead.addEventListener('click', function(){
  playSfx('tap');
  showContactState('read');
});

/* Yes → next / whatsapp */
var bYes = document.getElementById('q-yes');
if(bYes) bYes.addEventListener('click', function(){
  playSfx('nav');
  qIdx++;
  if(qIdx < QUESTIONS.length){ setQuestion(); }
  else{ showContactState('wa'); }
});

/* Not now → idle */
var bNo = document.getElementById('q-no');
if(bNo) bNo.addEventListener('click', function(){
  playSfx('tap');
  showContactState('idle');
});

/* Back */
var bBack = document.getElementById('wa-back');
if(bBack) bBack.addEventListener('click', function(){
  playSfx('tap');
  showContactState('idle');
});

/* Returns */
var bRetMaybe = document.getElementById('ret-maybe');
if(bRetMaybe) bRetMaybe.addEventListener('click', function(){
  playSfx('tap');
  showContactState('idle');
});

var bRetRead = document.getElementById('ret-read');
if(bRetRead) bRetRead.addEventListener('click', function(){
  playSfx('tap');
  showContactState('idle');
});

var waOpen = document.getElementById('wa-open');
if(waOpen) waOpen.addEventListener('click', function(){
  playSfx('nav');
});


/* ══════════════════════════════════════════════════
   16. TOUCH RIPPLE on nav buttons (mobile feel)
══════════════════════════════════════════════════ */
document.querySelectorAll('.nav-btn').forEach(function(btn){
  btn.addEventListener('touchstart', function(e){
    var r = btn.getBoundingClientRect();
    var ripple = document.createElement('span');
    ripple.style.cssText =
      'position:absolute;width:60px;height:60px;border-radius:50%;'
      +'background:rgba(255,183,197,0.12);pointer-events:none;'
      +'transform:scale(0);animation:rippleAnim .5s ease forwards;'
      +'left:'+(e.touches[0].clientX-r.left-30)+'px;'
      +'top:'+(e.touches[0].clientY-r.top-30)+'px;';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(function(){ ripple.remove(); }, 500);
  },{passive:true});
});

/* Inject ripple keyframe */
(function(){
  var s = document.createElement('style');
  s.textContent = '@keyframes rippleAnim{to{transform:scale(2.5);opacity:0;}}';
  document.head.appendChild(s);
})();


/* ══════════════════════════════════════════════════
   17. DOM READY INIT
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function(){
  /* Nav hidden until entry */
  document.getElementById('main-nav').style.display = 'none';
  /* Scroll hint hidden until entry */
  var hint = document.getElementById('scroll-hint');
  if(hint) hint.style.opacity = '0';
  updateAudioButtonState();
  /* Pre-run observer (catches nothing yet, but sets up) */
  observeCards();
});


/* ══════════════════════════════════════════════════
   CREDITS PAGE — petals + scroll reveal
══════════════════════════════════════════════════ */
var creditsInited = false;

function initCredits(){
  if(creditsInited) return;
  creditsInited = true;
  buildCreditsPetals();
  observeCreditItems();
}

function buildCreditsPetals(){
  var wrap = document.getElementById('cr-petals-wrap');
  if(!wrap) return;

  var SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">'
    +'<path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>'
    +'<path d="M12 22a3 3 0 0 0 3-3v-1a3 3 0 0 0-6 0v1a3 3 0 0 0 3 3z"/>'
    +'<path d="M2 12a3 3 0 0 0 3 3h1a3 3 0 0 0 0-6H5a3 3 0 0 0-3 3z"/>'
    +'<path d="M22 12a3 3 0 0 0-3-3h-1a3 3 0 0 0 0 6h1a3 3 0 0 0 3-3z"/>'
    +'</svg>';

  for(var i=0;i<28;i++){
    var p   = document.createElement('div');
    p.className = 'cr-petal';
    var sz  = Math.random()*13+7;
    var lft = Math.random()*100;
    var dur = Math.random()*18+10;
    var del = Math.random()*22;
    var op  = Math.random()*0.2+0.07;
    p.style.cssText =
      'left:'+lft+'vw;width:'+sz+'px;height:'+sz+'px;'
      +'color:rgba(255,183,197,'+op+');'
      +'animation-duration:'+dur+'s;animation-delay:-'+del+'s;';
    p.innerHTML = SVG;
    wrap.appendChild(p);
  }
}

function observeCreditItems(){
  var items = document.querySelectorAll('.cr-item');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var idx = Array.from(items).indexOf(en.target);
      setTimeout(function(){ en.target.classList.add('vis'); }, idx * 180);
      io.unobserve(en.target);
    });
  },{threshold:0.1});
  items.forEach(function(el){ io.observe(el); });
}
