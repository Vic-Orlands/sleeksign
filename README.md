# SleekSign 🖊️ v2.0

SleekSign is a professional, self-hosted document signing application. Version 2.0 adds enterprise-grade features including legal audit trails, multi-signer support, and field templates.

## ✨ Features

- **Sleek Signature Maker:** 
  - **Variety:** 4 beautiful script fonts with a live picker.
  - **Type:** Animated SVG tracing of your name.
  - **Draw:** Smooth, pressure-sensitive signature canvas.
  - **Upload:** Image support (PNG/JPG).
- **HR Power Tools:** 
  - **Interactive Setup:** Click-to-place, drag-to-move, and resize boxes.
  - **Field Templates:** Save document layouts and reuse them instantly.
  - **Dashboard:** Real-time tracking of signer activity and session status.
- **Advanced Field Types:** 
  - **Date:** Auto-fill current date.
  - **Checkbox:** Interactive "I agree" toggles.
- **Legal & Compliance:** 
  - **Audit Trail:** Professional "Certificate of Completion" appended to every PDF.
  - **Metadata:** Captures signer IP addresses, user agents, and completion timestamps.
- **Multi-Signer Support:** 
  - **Concurrent Signing:** Multiple staff can sign the same document independently via unique secure links.
- **Privacy & Sovereignty:** 
  - Full data ownership. Self-hosted on SQLite with zero external dependencies.

## 🛠️ Tech Stack

- **Next.js 16** (App Router, Webpack mode for PDF processing)
- **Drizzle ORM** & **SQLite**
- **Tailwind CSS** + **Custom Shadcn UI** (Zero border-radius theme)
- **pdf-lib** (PDF merging & certificate generation)
- **opentype.js** (Name-to-SVG engine)
- **react-rnd** (Interactive field manipulation)
- **react-pdf-viewer** (Sophisticated document rendering)

## 🚀 Getting Started

1. `npm install`
2. `npx drizzle-kit push` (Sync database)
3. `npm run dev`
4. Access HR dashboard at `/hr`

## 📐 Design Philosophy

SleekSign follows a **Sharp/Brutalist** aesthetic:
- No rounded corners.
- Layered shadows for depth.
- High-contrast, monochromatic palette with sharp accents.

## 📄 License

MIT
