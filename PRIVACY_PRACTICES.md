# Privacy Practices for GitHub Repo Search Extension

## Permission Justifications

### activeTab Permission

**Justification**: This permission is required to enable the Alt+G keyboard shortcut functionality that allows users to quickly open the search overlay on any webpage. The extension needs to inject its search interface into the currently active tab when the hotkey is pressed.

**Data Usage**: The extension only reads the current tab's URL to determine context but does not collect, store, or transmit any webpage content or user browsing data.

### storage Permission

**Justification**: This permission is required to store GitHub Personal Access Tokens and user authentication state locally in the browser. This enables users to authenticate once and maintain their session across browser sessions.

**Data Usage**: Only stores GitHub Personal Access Tokens and user authentication state locally in the browser. No personal data is transmitted to external servers except for GitHub API calls using the provided token.

### Host Permission (https://api.github.com/*)

**Justification**: This permission is required to make API calls to GitHub's public API to search for repositories. The extension needs to fetch repository information, statistics, and metadata to display search results.

**Data Usage**: Only makes API calls to GitHub's public search API. No user data is sent to GitHub beyond the search queries entered by the user and the optional Personal Access Token for authentication.

### Remote Code Use

**Justification**: This extension does NOT execute any remote code. The extension only makes standard API calls to GitHub's public API endpoints using the fetch() API to retrieve JSON data. No JavaScript or other executable code is loaded from external sources.

**Data Usage**: Only JSON data responses from GitHub API are processed locally within the extension.

## Data Handling

### What data is collected:

- GitHub Personal Access Tokens (stored locally only)
- Search queries (sent only to GitHub API, not stored)
- User authentication state (stored locally only)

### What data is NOT collected:

- Personal information
- Browsing history
- Website content
- User behavior tracking
- Analytics data

### Data storage:

- All data is stored locally in the browser using Chrome's storage API
- No data is transmitted to external servers except for GitHub API calls
- No data is shared with third parties

### Data retention:

- Authentication tokens are stored until user manually logs out
- No persistent tracking or data collection beyond authentication state

## Contact Information

For privacy-related questions, please contact: [Your Email Address]

## Single Purpose Description

This extension serves a single purpose: to provide quick GitHub repository search functionality through a keyboard shortcut (Alt+G), allowing developers to efficiently find and navigate to GitHub repositories without leaving their current webpage.
