# SleekSign 🖊️

SleekSign is a beautiful, self-hosted document signing application designed for internal company use. It eliminates the friction of downloading, signing, and returning documents by providing a seamless, web-based signing experience.

## ✨ Features

- **Sleek Signature Maker:** 
  - **Type:** Generates an animated SVG of your name using elegant script fonts.
  - **Draw:** Smooth, pressure-sensitive signature canvas.
  - **Upload:** Support for existing signature images.
- **HR Dashboard:** 
  - Easy PDF document uploads.
  - **Interactive Setup:** Click-to-place signature and text fields.
  - **Drag & Resize:** Full control over field positioning and dimensions.
  - **Shareable Links:** Secure, unique signing links for recipients.
- **Signer Portal:** 
  - Minimalist, account-free signing experience.
  - Real-time field validation.
  - One-click finalization and PDF generation.
- **Privacy & Sovereignty:** 
  - Self-hosted: You own your data.
  - SQLite backend: No complex database setup required.

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** SQLite with Drizzle ORM
- **Styling:** Tailwind CSS + Customized Shadcn UI (Sharp/Brutalist theme)
- **PDF Processing:** `pdf-lib`
- **Signature Engine:** `opentype.js` (Name-to-SVG)
- **Interactive UI:** `react-pdf-viewer` & `react-rnd` (Drag & Resize)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm / pnpm / yarn

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📐 Design Philosophy

SleekSign follows a **Sharp/Brutalist** aesthetic:
- **Zero Border Radiuses:** Everything is crisp and structural.
- **Layered Depth:** Using shadows instead of borders for elevation.
- **Distinctive Typography:** Striking display fonts paired with clean body text.
- **Fluid Motion:** Interruptible CSS transitions and staggered reveal animations.

## 📄 License

MIT
