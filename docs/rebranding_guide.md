# FreeAuth Rebranding Guide

This guide explains how to configure the visual identity of your Telegram bot using **@BotFather**. While your server handles the logic and rich media inside the chat, these settings control how your bot appears in search results, shared links, and the profile view.

A professional appearance is critical for user trust, especially when asking for phone number verification.

## Prerequisites

1.  Open Telegram.
2.  Search for **@BotFather** (verified account with a blue checkmark).
3.  Type `/mybots` and select your bot from the list.

---

## 1. The Bot Name

**What it is:** The title displayed in the chat list and header.
**Goal:** It should be clear, professional, and indicate function.

- **Command:** `/setname`
- **Recommended Format:** `AppName | Action`
- **Example:** `FreeAuth | Secure Verification` or `Chibo | Login`

## 2. The Description ("The Hook")

**What it is:** The text users see on the empty screen **before** they click the "Start" button.
**Goal:** This is your landing page. Explain _why_ they are here and that it is free/safe.

- **Command:** `/setdescription`
- **Template:**

  ```text
  🔐 Secure Identity Verification

  Welcome! This bot helps you securely verify your phone number for [Your App Name].

  ✅ Instant Verification
  ✅ Secure & Private

  Tap "Start" below to begin.
  ```

## 3. The About Text (Profile Bio)

**What it is:** The text displayed when a user clicks on the bot's profile picture or "Bio".
**Goal:** Provide credibility and support info.

- **Command:** `/setabouttext`
- **Example:**
  `text
    Official automated verification gateway for [your app]. Powered by FreeAuth & Telegram.
Support: @your_support_usename
    `

## 4. The Profile Picture (Avatar)

**What it is:** The icon shown in the chat list.
**Goal:** A bot with a default letter icon looks "scammy." You need a clean logo.

- **Command:** `/setuserpic`
- **Specs:** Minimum 512x512 pixels.
- **Design Tip:** Use a bold icon on a solid background. Avoid small text.
  - _Idea:_ A white shield with a checkmark on a blue background.
  - _Idea:_ Your App's logo with a small "lock" icon in the corner.

## 5. Command List (Optional)

**What it is:** The menu button next to the text input.
**Goal:** Even though this is an automated bot, adding a help command makes it feel more robust.

- **Command:** `/setcommands`
- **Input:**
  ```text
  start - Begin verification
  help - Get support
  privacy - Read privacy policy
  ```

---

## Summary of Commands

| Element         | Command           | Where it appears                              |
| :-------------- | :---------------- | :-------------------------------------------- |
| **Name**        | `/setname`        | Chat header, Notification titles              |
| **Description** | `/setdescription` | The large empty space before clicking "Start" |
| **About Text**  | `/setabouttext`   | In the bot's profile info                     |
| **Profile Pic** | `/setuserpic`     | Chat list icon                                |

## Pro Tip: File IDs for Code

If you want to use specific images in your `server.js` (for the banners) without hosting them on external URLs:

1.  Send the image to your bot in a private chat.
2.  Forward that message to a bot like `@JsonDumpBot`.
3.  Copy the `file_id` from the JSON response.
4.  Use that string in your `ASSETS` object in `server.js` instead of the URL.
