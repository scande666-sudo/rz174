/* ============================================================
   ПРОТЕКТОР — движение сайта.
   Один цикл кадра, все элементы собраны один раз.
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smoothstep = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- прелоадер: линейный счётчик, потолок 4 с ---------- */
  const pre = $('#pre'), preNum = $('#preNum'), preBar = $('#preBar');
  const T_MIN = 1700, T_MAX = 4000, t0 = performance.now();
  let assetsReady = false;
  const tireImg = $('#tireImg');
  const ready = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(res => { if (tireImg.complete) res(); else { tireImg.onload = res; tireImg.onerror = res; } })
  ]).then(() => { assetsReady = true; });

  let preDone = false;
  const preTick = setInterval(() => {
    const el = performance.now() - t0;
    const p = clamp(el / T_MIN);
    const n = Math.round(p * 100);
    preNum.textContent = String(n).padStart(2, '0');
    preBar.style.transform = `scaleX(${p})`;
    if ((p >= 1 && assetsReady) || el >= T_MAX) finishPre();
  }, 40);

  function finishPre() {
    if (preDone) return; preDone = true;
    clearInterval(preTick);
    preNum.textContent = '100'; preBar.style.transform = 'scaleX(1)';
    pre.classList.add('is-done');
    document.body.classList.add('is-in');
    setTimeout(() => { pre.style.display = 'none'; }, 1000);
  }

  /* ---------- курсор ---------- */
  const cur = $('#cur'), curTag = $('#curTag');
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const curPos = { x: mouse.x, y: mouse.y };
  if (fine && !reduced) {
    document.body.classList.add('no-cursor');
    addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; cur.classList.add('is-on'); });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    $$('[data-drag]').forEach(el => {
      el.addEventListener('mouseenter', () => { curTag.textContent = 'тяни'; cur.classList.add('is-hot'); });
      el.addEventListener('mouseleave', () => cur.classList.remove('is-hot'));
    });
  }

  /* ---------- появление по скроллу ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-vis'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  $$('.rv').forEach((el, i) => { el.style.transitionDelay = `${(i % 6) * 80}ms`; io.observe(el); });

  /* ---------- тема: светлая на секции «25 минут» ---------- */
  const lightSections = $$('[data-light]');
  const themeIO = new IntersectionObserver(entries => {
    let light = false;
    entries.forEach(en => { if (en.isIntersecting) light = true; });
    // если ни одна светлая секция не пересекает центр экрана — тёмная
    const anyLight = lightSections.some(s => {
      const r = s.getBoundingClientRect(); const mid = innerHeight * 0.5;
      return r.top < mid && r.bottom > mid;
    });
    document.body.dataset.theme = anyLight ? 'light' : 'dark';
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  lightSections.forEach(s => themeIO.observe(s));

  /* ---------- шторка записи ---------- */
  const drawer = $('#drawer');
  const openDrawer = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); setTimeout(() => $('#form2 input').focus(), 650); };
  const closeDrawer = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); };
  $$('[data-open]').forEach(el => el.addEventListener('click', e => {
    // плашки услуг ведут на запись только по клику на стрелку-ссылку; сами карточки открывают шторку
    e.preventDefault(); openDrawer();
  }));
  $$('[data-close]').forEach(el => el.addEventListener('click', closeDrawer));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  /* ---------- формы: имя и телефон, ничего больше ---------- */
  const maskPhone = input => {
    let d = input.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' ' + d.slice(1, 4);
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    input.value = out;
  };
  $$('input[type="tel"]').forEach(inp => {
    inp.addEventListener('focus', () => { if (!inp.value) inp.value = '+7 '; });
    inp.addEventListener('input', () => maskPhone(inp));
    inp.addEventListener('blur', () => { if (inp.value.replace(/\D/g, '').length <= 1) inp.value = ''; });
  });
  $$('form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('.field', f).forEach(fl => {
      const inp = $('input', fl);
      const bad = inp.type === 'tel' ? inp.value.replace(/\D/g, '').length < 11 : inp.value.trim().length < 2;
      fl.classList.toggle('is-bad', bad); if (bad) ok = false;
    });
    if (!ok) return;
    f.classList.add('is-sent');
  }));

  /* ---------- плавные ссылки ---------- */
  $$('a[href^="#"]:not([data-open])').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault();
    const top = t.getBoundingClientRect().top + scrollY;
    // целимся в липкую сцену, а не в её низ
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ============================================================
     ЦИКЛ КАДРА. Всё, что зависит от скролла и курсора.
     ============================================================ */
  const heroRig = $('#hero'), heroBg = $('#heroBg'), tireWrap = $('#tireWrap'), tireSpin = $('#tireSpin'), heroHint = $('#heroHint');
  const heroH = $('.hero__h'), heroSub = $('.hero__sub'), heroSide = $('.hero__side'), heroLabel = $('.hero__label');

  const svCards = $$('.card'), svIndex = $('#svIndex');

  const route = $('.route'), routePath = $('#routePath');
  const routeLen = routePath.getTotalLength();
  routePath.style.setProperty('--len', routeLen);
  const routeItems = $$('.step, .ph', route).map(el => ({ el, speed: parseFloat(el.dataset.speed || 0), img: $('img', el) }));

  const glRig = $('#raboty'), glTrack = $('#glTrack'), glBar = $('#glBar');

  const ft = $('#ft'), ftTire = $('#ftTire'), ftLetters = $$('#ftLogo span');
  const letterRects = () => ftLetters.map(l => { const r = l.getBoundingClientRect(); return { l, cx: r.left + r.width / 2, w: r.width }; });
  let letters = [];
  const measure = () => { letters = letterRects(); };

  let smoothY = scrollY, tilt = { x: 0, y: 0 }, mx = 0, my = 0;
  let ticking = true;

  function frame() {
    const y = scrollY;
    smoothY += (y - smoothY) * 0.14;
    if (Math.abs(smoothY - y) < 0.08) smoothY = y;
    const vh = innerHeight;

    /* курсор */
    if (fine && !reduced) {
      curPos.x += (mouse.x - curPos.x) * 0.22; curPos.y += (mouse.y - curPos.y) * 0.22;
      cur.style.transform = `translate3d(${curPos.x}px, ${curPos.y}px, 0)`;
      mx += ((mouse.x / innerWidth - 0.5) - mx) * 0.06;
      my += ((mouse.y / vh - 0.5) - my) * 0.06;
    }

    /* --- хиро: шина крутится и уходит, интерфейс расходится --- */
    {
      const dist = clamp(-heroRig.getBoundingClientRect().top, 0, heroRig.offsetHeight - vh);
      const p = clamp(dist / (heroRig.offsetHeight - vh));           // 0..1 по ходу липкой сцены
      const rot = smoothY * 0.12;                                     // оборот от скролла
      const go = smoothstep(0.15, 1, p);                              // уход шины
      const scale = 1 + go * 0.55;
      const ty = go * vh * 0.35;
      tireWrap.style.transform = `translate3d(0, ${ty}px, 0) scale(${scale})`;
      tireSpin.style.transform = `rotateY(${mx * -18}deg) rotateX(${my * 14}deg) rotate(${rot}deg)`;
      tireWrap.style.opacity = 1 - smoothstep(0.6, 1, p);
      heroBg.style.transform = `translate3d(${mx * -14}px, ${my * -10 + dist * 0.12}px, 0) scale(${1 + go * 0.08})`;
      const out = smoothstep(0, 0.45, p);
      heroH.style.transform = `translate3d(0, ${-out * 90}px, 0)`; heroH.style.opacity = 1 - out;
      heroSub.style.transform = `translate3d(0, ${-out * 60}px, 0)`; heroSub.style.opacity = 1 - out;
      heroSide.style.transform = `translate3d(0, ${-out * 70}px, 0)`; heroSide.style.opacity = 1 - out;
      heroLabel.style.opacity = 1 - out;
      heroHint.classList.toggle('is-off', y > 40);
    }

    /* --- услуги: липкий индекс --- */
    {
      let idx = 1;
      for (let i = 0; i < svCards.length; i++) {
        const r = svCards[i].getBoundingClientRect();
        if (r.top < vh * 0.55) idx = i + 1;
      }
      const s = String(idx).padStart(2, '0');
      if (svIndex.textContent !== s) svIndex.textContent = s;
    }

    /* --- 25 минут: линия рисуется, фото и шаги плывут с разной скоростью --- */
    {
      const r = route.getBoundingClientRect();
      const p = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.4));
      routePath.style.strokeDashoffset = routeLen * (1 - p);
      const center = r.top + r.height / 2 - vh / 2;                 // расстояние центра секции от центра экрана
      for (const it of routeItems) {
        it.el.style.transform = `translate3d(0, ${-center * it.speed}px, 0)`;
        if (it.img) it.img.style.transform = `translate3d(0, ${center * 0.05}px, 0)`;
      }
    }

    /* --- работы: вертикальный ход в горизонтальный --- */
    {
      const dist = clamp(-glRig.getBoundingClientRect().top, 0, glRig.offsetHeight - vh);
      const p = dist / (glRig.offsetHeight - vh);
      const max = glTrack.scrollWidth - innerWidth + 56;
      glTrack.style.transform = `translate3d(${-p * max}px, 0, 0)`;
      glBar.style.transform = `scaleX(${p})`;
    }

    /* --- футер: шина и буквы живут от курсора и скролла --- */
    {
      const r = ft.getBoundingClientRect();
      if (r.top < vh) {
        const p = clamp((vh - r.top) / vh);
        ftTire.style.transform = `translate3d(${mx * -40}px, ${(1 - p) * 160 + my * -30}px, 0) rotate(${smoothY * 0.06 + mx * 40}deg)`;
        if (fine && !reduced && letters.length) {
          for (const L of letters) {
            const d = Math.abs(mouse.x - L.cx);
            const k = 1 - clamp(d / 260);
            const lift = k * k * -34;
            L.l.style.transform = `translate3d(0, ${lift}px, 0) skewX(-7deg)`;
            L.l.style.color = k > 0.55 ? '#e0261e' : '';
          }
        }
      }
    }

    requestAnimationFrame(frame);
  }

  measure();
  addEventListener('resize', measure);
  ready.then(() => setTimeout(measure, 100));
  requestAnimationFrame(frame);
})();
