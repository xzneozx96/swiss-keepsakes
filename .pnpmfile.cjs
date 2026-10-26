// better-auth lists drizzle-kit, vitest, react, @tanstack/react-start and others as optional peers. pnpm links an optional peer that
// the workspace has, even as a development dependency, so a production install would carry them. The API needs
// only drizzle-orm and pg from that list, and both are its own dependencies.
const unusedPeers = ['drizzle-kit', 'vitest', 'react', 'react-dom', '@tanstack/react-start']

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'better-auth') {
        for (const peer of unusedPeers) {
          delete pkg.peerDependencies?.[peer]
          delete pkg.peerDependenciesMeta?.[peer]
        }
      }
      return pkg
    },
  },
}
