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
// Vercel serves dist/ publicly; only the standalone host needs a server there.
if (!process.argv.includes('--vercel')) {
  await build({ ...options, entryPoints:['server.ts'], outfile:'dist/server.mjs' });
}
await build({ ...options, entryPoints:['backend/serverless.ts'], outfile:'build/serverless.mjs' });
