/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Windows CI: sharp native binary may be missing — avoid Image Optimization requiring it during prerender
  images: { unoptimized: true },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['sharp', 'sqlite3'],
  },
  turbopack: {},
  outputFileTracingExcludes: {
    '*': [
      '**/venv/**/*',
      '**/.venv/**/*',
      '**/node_modules/**/*',
      '**/local-ai/output/**/*',
      '**/generated/local-ai/output/**/*',
    ],
  },
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/data/**",
        "**/config/**",
        "**/generated/**",
        "**/cache/**",
        "**/telemetry/**",
        "**/logs/**",
        "**/uploads/**",
        "**/benchmarks/**",
        "**/events/**",
        "**/runtime/**",
        "**/tmp/shortfactory/**",
        "**/data/scene-cache/**",
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
      ],
    };
    // Prevent native-only modules from being bundled by webpack
    // sqlite3 uses native bindings — it's loaded conditionally at runtime
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('sqlite3');
      config.externals.push('sharp');
      config.externals.push('@img/sharp-win32-x64');
      config.externals.push('@img/sharp-libvips-win32-x64');
    }
    // Suppress "critical dependency" warnings from dynamic require()
    config.module.exprContextCritical = false;
    return config;
  },
};

export default nextConfig;
