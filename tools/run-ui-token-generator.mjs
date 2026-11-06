import { createServer } from 'vite';

// Run the existing TypeScript generator through the project's installed Vite.
const server = await createServer({
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    appType: 'custom',
});
try {
    const target = process.argv[2];
    if (!target) throw new Error('Missing token generator path');
    await server.ssrLoadModule('/' + target);
} finally {
    await server.close();
}
