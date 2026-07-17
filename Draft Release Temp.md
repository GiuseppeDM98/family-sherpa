# Draft release notes

Unreleased changes — kept up to date session by session, published at cut time.

## ✨ New Features

- Added the initial installable Progressive Web App shell, with a mobile bottom navigation bar (desktop gets a side rail instead): Home, Scadenze, Inbox, Asset, Altro — the last linking through to placeholder Medicine Cabinet and Settings screens.
- Added sign-up and sign-in with email and password.
- Added the ability to create a new family or join an existing one with an invite code.
- Added a settings page showing your family's name, a copyable invite code, the member list, and a sign-out button.

## 🔒 Security

- Added encryption at rest for sensitive personal data (like codice fiscale and free-text notes) using AES-256-GCM — the database never stores this information in plain text.
- Added an optional allowlist for self-hosted instances: restrict who can sign up or start a new family to a pre-approved list of email addresses.
