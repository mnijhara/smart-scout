# CI recovery

The last available build failed at TypeScript because `createControlPlaneRouter` was referenced by `server.ts` but missing from the repository. The router has now been restored. Live-site verification remains intentionally excluded from this release gate.
