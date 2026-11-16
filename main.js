// Portfolio page behaviour. Plain JS + GSAP ScrollTrigger, no build step.
(() => {
  document.documentElement.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // Scroll reveal: IntersectionObserver, one-shot.
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

  // Count-up for the stats row: draws the eye to the numbers once.
  const fmt = (n, el) => {
    const s = el.dataset.format === 'thousands' ? Math.round(n).toLocaleString('en-US') : Math.round(n);
    return s + (el.dataset.suffix || '');
  };
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      countIO.unobserve(el);
      const target = Number(el.dataset.count);
      if (reduce) { el.textContent = fmt(target, el); return; }
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)), el);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

  // Threads bars grow when visible.
  document.querySelectorAll('.bar__v').forEach((b) => b.style.setProperty('--s', reduce ? 1 : 0));
  const barIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.bar__v').forEach((b, i) => setTimeout(() => b.style.setProperty('--s', 1), i * 180));
      barIO.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.bars').forEach((el) => barIO.observe(el));

  // Cover cycler in the channels bento.
  document.querySelectorAll('[data-covers]').forEach((box) => {
    const imgs = [...box.querySelectorAll('img')];
    let i = 0;
    imgs[0].classList.add('is-on');
    if (reduce || imgs.length < 2) return;
    setInterval(() => {
      imgs[i].classList.remove('is-on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('is-on');
    }, 2600);
  });

  // Lite YouTube embed: the iframe loads only on click.
  document.querySelectorAll('.yt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      f.title = btn.getAttribute('aria-label') || 'YouTube video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      btn.replaceChildren(f);
      btn.style.cursor = 'default';
    }, { once: true });
  });

  // Marquee: duplicate the set so translateX(-50%) loops seamlessly.
  document.querySelectorAll('.marquee__track').forEach((t) => {
    [...t.children].forEach((c) => { const d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); t.appendChild(d); });
  });

  // Pause background videos that are off screen (battery and CPU).
  const vidIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const v = e.target; if (e.isIntersecting && !reduce) v.play().catch(() => {}); else v.pause(); });
  }, { threshold: 0.1 });
  document.querySelectorAll('video[autoplay]').forEach((v) => { if (reduce) v.removeAttribute('autoplay'); vidIO.observe(v); });

  // Rotating noun in the hero headline.
  const words = [...document.querySelectorAll('.rot__w')];
  if (words.length > 1 && !reduce) {
    let w = 0;
    setInterval(() => {
      const cur = words[w];
      cur.classList.remove('is-on'); cur.classList.add('is-out');
      w = (w + 1) % words.length;
      words[w].classList.remove('is-out'); words[w].classList.add('is-on');
      setTimeout(() => cur.classList.remove('is-out'), 650);
    }, 2400);
  }

  // Before / after compare.
  document.querySelectorAll('.ba').forEach((box) => {
    const r = box.querySelector('.ba__range');
    const set = () => box.style.setProperty('--x', r.value + '%');
    r.addEventListener('input', set); set();
  });

  if (!hasGsap || reduce) { document.querySelectorAll('[data-hero]').forEach((el) => (el.style.opacity = 1)); return; }

  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance: copy first, then the media stack, so the eye lands on the headline.
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('[data-hero]', { y: 28, opacity: 0, duration: 1.1, stagger: 0.09 })
    .from('[data-hero-media]', { y: 50, opacity: 0, scale: 0.96, duration: 1.3, stagger: 0.15 }, '-=0.9');

  // Hero depth: mosaic tiles drift at slightly different speeds while the hero scrolls away.
  gsap.utils.toArray('.tile').forEach((t) => {
    gsap.to(t, {
      yPercent: Number(t.dataset.speed || 0), ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  // Pipeline: pin and pan horizontally on wide screens so the steps read as a sequence.
  const mm = gsap.matchMedia();
  mm.add('(min-width: 721px)', () => {
    const pipe = document.querySelector('.pipe');
    const track = document.querySelector('.pipe__track');
    pipe.classList.add('is-pinned');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: pipe, start: 'top 68px', end: () => `+=${distance()}`,
        pin: true, scrub: 1, invalidateOnRefresh: true,
      },
    });
    return () => { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); pipe.classList.remove('is-pinned'); };
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
