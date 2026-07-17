# Draft release notes

Unreleased changes — kept up to date session by session, published at cut time.

## ✨ New Features

- Added the initial installable Progressive Web App shell, with a mobile bottom navigation bar (desktop gets a side rail instead): Home, Scadenze, Inbox, Asset, Altro — the last linking through to placeholder Medicine Cabinet and Settings screens.

## 🔒 Security

- Added encryption at rest for sensitive personal data (like codice fiscale and free-text notes) using AES-256-GCM — the database never stores this information in plain text.
