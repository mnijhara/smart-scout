// Hostinger runtime entrypoint.
// Keep runtime free of tsx/esbuild: Hostinger may not allow executing
// the esbuild binary shipped inside tsx (EACCES).
import('./server.js').catch((err) => {
  console.error('Failed to start SmartScout server:', err);
  process.exit(1);
});
