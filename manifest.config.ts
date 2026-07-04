import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'LinguaLens',
  version: '0.0.0',
  action: {
    default_popup: 'index.html',
    default_title: 'LinguaLens'
  },
  permissions: ['storage'],
  host_permissions: ['https://api.openai.com/*', 'https://generativelanguage.googleapis.com/*'],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/selection.ts']
    }
  ]
});
