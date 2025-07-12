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
    default_title: "GitHub Browser Plugin"
  },
  commands: {
    "_execute_action": {
      suggested_key: {
        default: "Alt+O",
        windows: "Alt+O",
        mac: "Alt+O",
        chromeos: "Alt+O",
        linux: "Alt+O"
      },
      description: "Open GitHub repository search"
    }
  }
})
