# In-App Notifications: Functional and Technical Guide

## 1. Purpose

This document explains how in-app notifications work in Spark for both:

- Business stakeholders (what users experience and why)
- Technical stakeholders (how data flows across UI, APIs, and storage)

It covers user notifications stored in KV and system notifications loaded from EDS, including priority modal behavior.

## 2. Business Overview

### What users get

- A notification bell in the header
- A badge indicator when unread notifications exist
- A dedicated **My Notifications** page to review, filter, mark read, and delete notifications
- Priority popups for important unread notifications on non-notification pages

### Why this matters

- Critical messages are surfaced immediately via priority modal
- Full notification history is available in one place (notification page)
- System announcements can be managed centrally via EDS sheets
- Users can control read/delete state without losing auditability of source data

## 3. Core Concepts

### Notification sources

- **User notifications**: stored in Cloudflare KV (`MESSAGES`)
- **System notifications**: loaded from EDS path `/{locale}/system-notifications`

### Notification types

- `Notification`
- `Alert`
- `Announcement`

### Priority levels

- `important`
- `normal`

Only `important` unread messages are considered for the priority popup flow.

### Channels

- **In-app**: bell + notification page + modal
- **Email**: triggered by feature-specific backend flows (separate from in-app rendering)

## 4. End-to-End User Experience

### 4.1 Header bell and badge

- Header exposes a bell icon that routes to localized `/my-dam/my-notifications`
- Badge is updated through `window.updateMessageBadge(unreadCount)`

### 4.2 Notification page behavior

On the My Notifications page:

- Messages are loaded from `/api/messages?locale=<current-locale>`
- System read/deleted state is reconciled from localStorage
- Deleted system messages are hidden client-side
- Expired messages are auto-cleaned:
  - User messages: delete when expired
  - System messages: delete only when both read and expired
- Users can filter by status/type/priority and perform read/delete actions

### 4.3 Priority modal behavior on other pages

During lazy page load (for logged-in users), the app checks for priority messages:

- If page is My Notifications, no priority modal is shown
- If no `important` unread message exists, nothing is shown
- If exactly one `Alert` (or mixed priority list without alert burst), item-by-item priority modal is shown
- If more than one unread `Alert` exists, a **generic alert summary modal** is shown instead of multiple alert popups

The summary modal includes:

- Dismiss action
- CTA to open My Notifications page and review all items

This prevents modal spam during alert bursts.

## 5. Technical Architecture

### 5.1 Backend API

File: `cloudflare/src/api/notifications.js`

Supported endpoints:

- `GET /api/messages` -> list notifications (KV + EDS merged)
- `GET /api/messages/:id` -> get user notification by ID
- `POST /api/messages` -> create user notification
- `POST /api/messages/:id` -> update user notification
- `DELETE /api/messages/:id` -> delete user notification

Authentication:

- Uses authenticated user from request context (`request.user.email`)
- User email is normalized to lowercase

Storage:

- KV key format: `<userEmail>:<notificationId>`
- Namespace: `MESSAGES`

Locale handling for system notifications:

- Query parameter `locale` is validated
- Supported locales: `en`, `ja`
- Fallback locale: `en`
- EDS path used: `/{locale}/system-notifications`

### 5.2 Frontend client and helpers

Key files:

- `scripts/notifications/notifications-client.js`
- `scripts/notifications/notifications-helpers.js`
- `blocks/my-notifications/my-notifications.js`

Responsibilities:

- Fetch merged messages from API with locale
- Treat system messages differently for read/delete
- Persist system read/deleted state in localStorage
- Filter, sort, count unread, and detect priority/expiry

System message localStorage keys:

- `spark-system-notifications-read`
- `spark-system-notifications-deleted`

### 5.3 Priority modal layer

Key files:

- `scripts/notifications/priority-modal.js`
- `scripts/notifications/priority-modal-utils.js`
- `scripts/global-modal.js`
- `styles/global-modal.css`

Behavior:

- `scripts/scripts.js` lazily imports and runs priority check for logged-in users
- Priority check updates badge and conditionally shows modal
- Generic alert summary modal is shown for multi-alert bursts
- Reusable global modal utility controls modal type, content type, buttons, and actions

Content support in global modal:

- Text
- HTML
- Scrollable text
- DOM node
- Iframe
- Image
- Video

Button actions:

- `close`
- `redirect`
- `custom` (function, with optional close behavior)

## 6. Notification Data Model

Standard fields:

- `id` (string, required)
- `owner` (string; user email for KV, `SYSTEM` for EDS system notifications)
- `date` (ISO timestamp)
- `subject` (string)
- `message` (string/HTML payload depending on producer)
- `type` (`Notification` | `Alert` | `Announcement`)
- `from` (string sender label/email)
- `priority` (`important` | `normal`)
- `expiresInXDays` (number)
- `status` (`unread` | `read`)

Notes:

- For system messages, read/deleted state is client-managed in localStorage.
- For user messages, status/delete is persisted through API/KV.

## 7. Message Lifecycle

1. Producer creates notification (typically backend helper writing to KV).
2. Client fetches merged list from `/api/messages`.
3. Client reconciles system read/deleted local state.
4. UI shows badge + list; priority modal may display for important unread.
5. User actions:
   - Mark read -> API update (user) or localStorage update (system)
   - Delete -> API delete (user) or localStorage delete marker (system)
6. Expired messages are auto-cleaned by page logic.

## 8. Producers and Integrations

Main helper for in-app creation:

- `cloudflare/src/util/notifications-helpers.js`
  - `sendMessage(env, recipientEmail, messageData)`
  - `sendMessageToMultiple(env, recipientEmails, messageData)`

Feature integrations (example):

- Rights request flows trigger in-app + email notifications from their API/service logic.

## 9. Operational Notes

### Known guardrails

- Priority modal does not run on My Notifications page.
- Multi-alert priority bursts collapse into one summary modal.
- If API load fails, priority modal flow safely skips.

### Important implementation detail

- Priority modal selection is based on `priority === 'important'`.
- Notifications with other values (for example `high`) will not enter the priority popup flow unless mapped by producer logic.

## 10. File Map

- API: `cloudflare/src/api/notifications.js`
- Backend helper: `cloudflare/src/util/notifications-helpers.js`
- Client SDK: `scripts/notifications/notifications-client.js`
- Client helpers: `scripts/notifications/notifications-helpers.js`
- Priority popup orchestrator: `scripts/notifications/priority-modal.js`
- Multi-alert summary modal helper: `scripts/notifications/priority-modal-utils.js`
- Generic modal utility: `scripts/global-modal.js`
- Generic modal styles: `styles/global-modal.css`
- Notification page block: `blocks/my-notifications/my-notifications.js`
- Header bell/badge: `blocks/header/header.js`

## 11. Diagrams

### Draw.io flowcharts

- `docs/notifications/diagrams/in-app-notification-flow.drawio`
- `docs/notifications/diagrams/notifications-lifecycle-flow.drawio`

### WebSequence diagrams

- `docs/notifications/diagrams/priority-modal-sequence.wsd`
- `docs/notifications/diagrams/my-notifications-page-sequence.wsd`

### How to use

- Open `.drawio` files in draw.io / diagrams.net.
- Open `.wsd` files in WebSequenceDiagrams (or compatible parser) to render sequence diagrams.
