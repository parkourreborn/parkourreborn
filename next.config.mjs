const dev = process.env.NODE_ENV !== 'production';
// Vercel sets VERCEL_ENV at build time. Preview deployments show the Vercel
// toolbar (vercel.live), which loads its own script, frame, styles and a
// websocket; production does not get these.
const toolbar = process.env.VERCEL_ENV === 'preview';

// Report-only for now: violations are logged by /api/csp-report but nothing is
// blocked. Once the reports are quiet, rename the header below to
// Content-Security-Policy to enforce it.
//
// - 'unsafe-inline' scripts: Next.js inline bootstrap scripts and the Unity page.
// - blob: + 'wasm-unsafe-eval': the Unity loader runs the decompressed framework
//   from a blob URL and instantiates WebAssembly.
// - img/media https:: community GIFs, videos and Guessr images come from
//   admin-curated hosts that change over time.
// - apis.google.com / *.firebaseapp.com: Firebase Auth's helper iframe, which
//   it loads on some mobile browsers.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://apis.google.com https://va.vercel-scripts.com${toolbar ? ' https://vercel.live' : ''}${dev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'${toolbar ? ' https://vercel.live' : ''}`,
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `font-src 'self' data:${toolbar ? ' https://vercel.live https://assets.vercel.com' : ''}`,
  `connect-src 'self' blob: data: https://*.googleapis.com https://va.vercel-scripts.com${toolbar ? ' https://vercel.live wss://ws-us3.pusher.com' : ''}${dev ? ' ws:' : ''}`,
  `frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://*.firebaseapp.com${toolbar ? ' https://vercel.live' : ''}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'report-uri /api/csp-report',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const config = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [{ source: '/parkourguessr', destination: '/games/parkourguessr', permanent: true }];
  },
};

export default config;
