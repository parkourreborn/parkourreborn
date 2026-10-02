const config = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
  outputFileTracingIncludes: {
    '/api/reborn-ai/chat': ['./knowledge/**/*.md'],
  },
};

export default config;
