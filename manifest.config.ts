import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDescription__',
  version: '0.8.0',
  minimum_chrome_version: '102',
  default_locale: 'en',
  options_page: 'settings.html',
  action: {
    default_popup: 'index.html',
    default_title: '__MSG_extensionName__',
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
  host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  // Content-script trigger icon is rendered into host pages; expose the asset explicitly.
  web_accessible_resources: [
    {
      resources: ['icons/icon.svg'],
      matches: ['<all_urls>']
    }
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module'
  },
  commands: {
    'toggle-word-lookup': {
      description: '__MSG_commandToggleWordLookup__',
      // Alt+L on Windows/Linux; on macOS Alt maps to Option (⌥+L).
      suggested_key: {
        default: 'Alt+L',
        mac: 'Alt+L'
      }
    }
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/selection.ts']
    }
  ]
});
