import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  permissions: [
    "activeTab",
    "storage",
    "identity"
  ],
  host_permissions: [
    "https://api.github.com/*"
  ],
  background: {
    service_worker: "src/background/main.ts",
    type: "module"
  },
  action: {
    default_popup: "src/popup/index.html",
    default_title: "GitHub Browser Plugin",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  commands: {
    "_execute_action": {
      suggested_key: {
        default: "Alt+G",
        windows: "Alt+G",
        mac: "Alt+G",
        chromeos: "Alt+G",
        linux: "Alt+G"
      },
      description: "Open GitHub repository search"
    }
  },
  web_accessible_resources: [
    {
      resources: ["src/auth/index.html"],
      matches: ["<all_urls>"]
    }
  ],
})
