# Questlog

**Your adventure awaits, adventurer!**

Questlog is an 8-bit gamified task app that turns your real-life goals into RPG quests. Complete main quests (months-long epic challenges), side quests (quick weekend adventures), and earn XP, badges, and achievements along the way.

![Pixel Art Hero](https://img.shields.io/badge/style-8--bit%20pixel%20art-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-auth%20%7C%20db-green)

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

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Auth & Database:** Supabase (PostgreSQL + Row Level Security)
- **AI:** Google Gemini
- **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account
- A Google Gemini API key (optional, for AI quest generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/questlog.git
   cd questlog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up Supabase**
   - Run the migrations in `supabase/migrations/`
   - Enable Google OAuth in Supabase Auth (optional)

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
questlog/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities, types, hooks
│   └── styles/          # Global styles
├── supabase/
│   ├── migrations/      # Database migrations
│   └── schema.sql        # Database schema
└── public/              # Static assets
```

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38
- Inspired by classic RPG quest logs and modern productivity apps

---

**Start your adventure today!** ⚔️
