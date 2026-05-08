/**
 * RentyBase brand components — shared across all static pages.
 * Load this script AFTER React CDN and BEFORE any Babel script.
 * Exposes window.RBMark and window.RBLogo.
 *
 * Usage in a Babel/JSX script:
 *   const { RBMark, RBLogo } = window;
 *   <RBLogo size={32} onDark href="/" />
 */
(function () {
  'use strict';

  var h = React.createElement;

  /**
   * RBMark — the house icon mark only.
   * @param {number}  size   — rendered size in px (default 36)
   * @param {boolean} onDark — true when placed on a dark background;
   *                           inverts bg/fg so the mark reads as a cream badge
   */
  function RBMark(props) {
    var size   = props.size   || 36;
    var onDark = props.onDark || false;

    // Standard (on-light): dark rounded square, cream house, ochre accent
    // On-dark: cream rounded square, dark house, ochre accent — reads as a stamp
    var bg = onDark ? '#F6F4EE' : '#0E1413';
    var fg = onDark ? '#0E1413' : '#F6F4EE';

    return h('svg', {
      viewBox: '0 0 40 40',
      width:   size,
      height:  size,
      'aria-hidden': 'true',
      focusable:     'false',
      xmlns: 'http://www.w3.org/2000/svg',
      style: { display: 'block', flexShrink: 0 },
    },
      h('rect',   { width: 40, height: 40, rx: 9, fill: bg }),
      h('path',   { d: 'M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z', fill: fg }),
      h('path',   { d: 'M13 34 V25 a7 7 0 0 1 14 0 V34 Z', fill: bg }),
      h('rect',   { x: 13, y: 33, width: 14, height: 1.4, fill: '#C97A3A' }),
      h('circle', { cx: 20, cy: 11, r: 0.9, fill: '#C97A3A' })
    );
  }

  /**
   * RBLogo — mark + "RentyBase" wordmark as a linked lockup.
   * @param {number}  size   — mark size in px; wordmark scales proportionally (default 32)
   * @param {boolean} onDark — pass true on dark backgrounds (default false)
   * @param {string}  href   — link destination (default "/")
   */
  function RBLogo(props) {
    var size   = props.size   || 32;
    var onDark = props.onDark || false;
    var href   = props.href   || '/';

    var wordColor = onDark ? '#F6F4EE' : '#0E1413';
    var fontSize  = Math.round(size * 0.59);   // 32 → ~19px, 36 → ~21px

    return h('a', {
      href: href,
      'aria-label': 'RentyBase',
      style: {
        display:        'inline-flex',
        alignItems:     'center',
        gap:            Math.round(size * 0.34) + 'px',
        textDecoration: 'none',
        lineHeight:     1,
        userSelect:     'none',
      },
    },
      h(RBMark, { size: size, onDark: onDark }),
      h('span', {
        style: {
          fontFamily:    "'DM Sans', system-ui, -apple-system, sans-serif",
          fontWeight:    700,
          fontSize:      fontSize + 'px',
          letterSpacing: '-0.022em',
          color:         wordColor,
          lineHeight:    1,
        },
      },
        'Renty',
        h('span', { style: { color: '#C97A3A' } }, 'Base')
      )
    );
  }

  window.RBMark = RBMark;
  window.RBLogo = RBLogo;
}());
