/* RentyBase — Shared JS for all inner pages */
(function () {
  // Scroll progress bar
  var prog = document.getElementById('scrollProgress');
  function onScroll() {
    if (prog) {
      var st = document.documentElement.scrollTop;
      var dh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      prog.style.width = (st / dh * 100) + '%';
    }
    // Nav shadow
    var nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('scrolled', document.documentElement.scrollTop > 10);
    // Back to top
    var bt = document.getElementById('backTop');
    if (bt) bt.classList.toggle('visible', document.documentElement.scrollTop > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  window.openMenu = function () { var m = document.getElementById('mobileMenu'); if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; } };
  window.closeMenu = function () { var m = document.getElementById('mobileMenu'); if (m) { m.classList.remove('open'); document.body.style.overflow = ''; } };

  // Button ripple
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(wave);
      setTimeout(function () { wave.remove(); }, 600);
    });
  });

  // Smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // Intersection observer for reveal animations
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
})();
