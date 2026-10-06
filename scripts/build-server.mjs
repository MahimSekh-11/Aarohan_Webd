import { build } from 'esbuild';

const options = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
};
// Keep backend bundles outside the publicly served frontend directory.
if (!process.argv.includes('--vercel')) {
  await build({ ...options, entryPoints:['server.ts'], outfile:'build/server.mjs' });
}
await build({ ...options, entryPoints:['backend/serverless.ts'], outfile:'build/serverless.mjs' });
