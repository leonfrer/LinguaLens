import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'LinguaLens',
  version: '0.2.0',
  action: {
    default_popup: 'index.html',
    default_title: 'LinguaLens',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    }
  },
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png'
  },
  permissions: ['storage'],
  host_permissions: ['https://integrate.api.nvidia.com/*'],
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
