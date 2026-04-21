<div align="center">

# ⚔️ QUESTLOG

**Turn your life into an RPG adventure**

[![Pixel Art](https://img.shields.io/badge/style-8--bit%20pixel%20art-00ff00?style=for-the-badge)](https://github.com/owenaslin/questlog)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)

<p align="center">
  <strong>An 8-bit gamified task app where your real-life goals become RPG quests.</strong><br>
  Complete epic main quests, quick side quests, earn XP, collect badges, and level up your life.
</p>

[🚀 Live Demo](#) · [📖 Documentation](#features) · [🛠️ Setup](#getting-started) · [🤝 Contribute](#contributing)

</div>

---

## 🎮 What is Questlog?

Questlog transforms productivity into an adventure. Instead of boring to-do lists, you get:

| Feature | Description |
|---------|-------------|
| 🗡️ **Main Quests** | Epic, months-long challenges like learning a language or training for a marathon |
| ⚡ **Side Quests** | Quick weekend adventures — cook something new, explore a trail, sketch a masterpiece |
| 🎯 **Questlines** | Multi-step skill trees (Fitness Journey, Creative Mastery, Tech Mastery) |
| 🏆 **XP & Badges** | Earn experience, unlock achievements, show off your collection |
| 🔥 **Streaks** | Build daily habits and maintain your adventure momentum |
| 🤖 **AI Quests** | Generate custom quests based on your location and interests |

---

## ✨ Features

### 🗡 Quest System
- **Main Quests** — Epic challenges that take months (learn a language, train for a marathon)
- **Side Quests** — Quick adventures from hours to a weekend (cook something new, explore a trail)
- **Questlines** — Multi-step skill trees with branching paths (Fitness Journey, Creative Mastery, Tech Mastery)

### 🎮 Gamification
- **XP & Leveling** — Earn XP based on quest difficulty, level up your adventurer
- **Badges** — Collect badges across 4 rarities: Common, Rare, Epic, Legendary
- **Questlines** — Linear and skill tree questlines with special completion badges
- **Streaks** — Track daily activity streaks
- **Weekly Recaps** — Review your weekly progress and achievements

### 🤖 AI Quest Generation
Generate custom quests based on:
- Your location
- Topics of interest
- Quest type (main or side)

### 🎨 Pixel Art Aesthetic
- 8-bit retro styling
- "Press Start 2P" pixel font
- Scanline overlay effect
- Pixel-perfect borders and shadows

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Supabase** | PostgreSQL database + Auth |
| **Google Gemini** | AI quest generation |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account
- A Google Gemini API key (optional, for AI quest generation)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/owenaslin/questlog.git
cd questlog

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run migrations in Supabase Dashboard, then:
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key  # Optional
```

Security notes:

- Do not add `SUPABASE_SERVICE_ROLE_KEY` for normal app runtime. Use least privilege by default.
- In hosted environments (for example Vercel), mark private credentials as sensitive.
- If a provider reports possible credential exposure, follow `SECURITY_INCIDENT_RESPONSE.md`.

### Supabase Setup
1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/`
3. Enable Row Level Security (RLS) policies are included
4. (Optional) Enable Google OAuth in Authentication settings

---

## 📁 Project Structure

```
questlog/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes (AI generation)
│   │   ├── quests/       # Quest browsing & details
│   │   ├── profile/      # User profile & progress
│   │   └── ...
│   ├── components/       # React components (PixelButton, QuestCard, etc.)
│   ├── lib/              # Utilities, types, hooks, data
│   └── styles/           # Global CSS & Tailwind
├── supabase/
│   ├── migrations/       # Database migrations
│   └── schema.sql        # Database schema
└── public/               # Static assets
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

Please ensure your code follows the existing patterns and includes appropriate tests.

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Font:** [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38
- **Inspiration:** Classic RPG quest logs and modern productivity apps

---

<div align="center">

**[⬆ Back to Top](#️-questlog)**

⚔️ *Start your adventure today!* 🎮

</div>
