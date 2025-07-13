/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "release/crx-github-repo-search-*.zip",
            label: "Chrome Extension Package",
            name: "crx-github-repo-search-${nextRelease.version}.zip",
          },
        ],
      },
    ],
  ],
};
