# idk — Workplace Glossary

A Chrome extension for decoding workplace acronyms and building your own company glossary. Runs entirely inside Chrome, offline. No server, account, build step, or dependencies required.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select this `idk-chrome` folder (the folder containing `manifest.json`). If using the ZIP, extract it first and select the extracted `idk` folder.
5. Open Chrome's extensions menu (the puzzle icon), pin **idk — Workplace Glossary**, then click its icon.

## Use

- Start typing to search your entries by acronym, expanded term, definition, or category. Exact acronym matches appear first. Multiple search words can match across fields.
- Choose a category to narrow results.
- Click **Add term** to save company-specific vocabulary. Expanded term, definition, and category are optional. Choose an existing category or type a new one.
- Click **Edit** on any entry to change its meaning or delete it. Duplicate acronyms with different expanded terms are supported.
- Star entries to find them under **Favorites**. Your additions appear under **My terms**.
- Click **↗** for a larger view in a Chrome tab. It still runs as an extension.
- Press **Alt+Shift+G** (Option+Shift+G on Mac) to open the popup. Chrome may reserve or conflict with shortcuts; customize it at `chrome://extensions/shortcuts`.
- Press **/** to focus search. Press **Escape** to clear search when no dialog is open.

## Backup and share

**Export** downloads a JSON backup of your glossary and favorites. **Import** accepts an exported file or a JSON array with `term`, `expansion`, `definition`, and `category` fields (expansion, definition, and category are optional):

```json
[
  {
    "term": "WBR",
    "expansion": "Weekly Business Review",
    "definition": "Our Monday review of team metrics and priorities.",
    "category": "Company terms"
  }
]
```

Import validates the entire file before saving, adds new entries to **My terms**, and keeps existing entries with the same term and expanded term. Favorites are restored when importing an idk export. Import merges; it does not replace or overwrite your glossary. To transfer an edited definition, edit the existing entry or import into a fresh installation.

## Storage and privacy

The extension requests only Chrome's `storage` permission. It uses `chrome.storage.local` in your Chrome profile; no data is sent anywhere and no websites are read. Data is not synced between devices. Uninstalling the extension removes its data, so export a backup first. Exported files contain your definitions; handle company information according to your workplace policy.

The glossary starts empty. Add your own terms or import a glossary. On upgrade from version 1.0, the original bundled entries and their favorites are removed; user-created and imported entries are kept.

## Development

The extension loads plain HTML, CSS, and JavaScript directly. After changing files, click the extension's reload button at `chrome://extensions`, then reopen its popup. No server or compilation is needed.

Optional logic and manifest checks, with Node.js installed:

```sh
npm test
```
