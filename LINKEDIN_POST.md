# 🔍 I Added Agentic AI to a Game Template — Here's What Happened

I took an existing v0/shadcn template and transformed it into **Atrium Sillage** — an interactive murder mystery game where AI agents don't just chat, they actively play a role in the story.

## 🎮 The Game

You're a detective investigating a murder in a 1930s Art Deco hotel. You have 12 turns to:
- Explore 6 rooms
- Search for clues
- Interrogate 4 suspects
- Accuse the culprit

## 🤖 The Agentic AI Magic

What makes this different from typical AI chatbots? **The agents have tools and agency.**

### 1. NPC Agent (Interrogation)
When you question a suspect, it's not just generating text. The agent:
- **Decides** whether to lie or tell the truth
- **Uses tools** like:
  - `revealClue` — Reveals information they're hiding (if you earn their trust)
  - `setComposure` — Updates their stress level (rises when you press them)
  - `leaveRoom` — Flees the room if stress > 75
- **Reacts dynamically** to your questioning style

### 2. Director Agent
Between your turns, an agent brings the manor to life:
- **Moves suspects** between rooms based on their stress and personality
- **Hides clues** (the culprit can secretly move evidence)
- **Creates ambient events** (thunder, doors slamming, shadows)
- **Never reveals** the killer's identity

## 🛠️ Tech Stack

- **Framework:** Next.js 15 + React
- **AI:** Vercel AI SDK with Google Gemini (gemini-flash-lite-latest)
- **Agent Framework:** ToolLoopAgent with function calling
- **UI:** Isometric room view inspired by Habbo Hotel
- **Style:** Pixel art aesthetic with draggable windows

## 💡 Key Insight

Traditional AI chat is passive. **Agentic AI is active.**

The agents here:
- Take decisions based on game state
- Execute actions via tools
- Have objectives (NPCs protect secrets, Director creates suspense)
- React dynamically to player behavior

This creates emergent gameplay where the story unfolds through agent-player interaction, not just pre-scripted dialogue.

## 🎯 What I Learned

1. **Tool design matters** — The right tools (revealClue, setComposure) create meaningful agent behavior
2. **Fallback is essential** — The game gracefully degrades to a hardcoded case if AI fails
3. **Streaming responses** — Critical for real-time dialogue feel
4. **State management** — Agents need context (stress, location, discovered clues) to make smart decisions

## 🚀 Try It

The game is fully playable with AI-powered NPC dialogues, procedural case generation, and ambient storytelling.

Built with:
- Next.js 15
- @ai-sdk/google
- ToolLoopAgent (agentic AI)
- Tailwind CSS + shadcn/ui

---

**Question:** What's your experience with agentic AI? Have you built agents that go beyond simple chat? Let's discuss in the comments! 👇

#AI #AgenticAI #NextJS #WebDev #GameDev #JavaScript #GoogleGemini #React #ToolCalling
