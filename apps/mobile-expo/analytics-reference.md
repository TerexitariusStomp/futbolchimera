# Soccer Analytics Reference

This file is the high-level index. Detailed concepts, data sources, and per-repo guides are linked below.

## Core Concepts

- **Expected Goals (xG)** — see `templates/xg-analysis.md` and `football-analytics-tutorials-reference.md`
- **Passing Networks** — connections between players based on pass completion
- **Pitch Control** — probability of controlling the ball at any pitch location
- **Player Tracking** — x,y coordinates for all players at high frequency

## Statistical Methods

- **Poisson Distribution** — goal scoring and match outcome probabilities
- **Regression Analysis** — relationships between variables like possession and goals
- **Cluster Analysis** — identifying similar playing styles and player types

## Integrated Repositories

| Repository | Focus | Detailed Reference |
|------------|-------|-------------------|
| `eddwebster/football_analytics` | Curated resources, data sources, notebooks, dashboards | `eddwebster-football-analytics-reference.md` |
| `ricardoherediaj/football-analytics-tutorials` | Tutorials for xG, xT, dashboards, scraping | `football-analytics-tutorials-reference.md` |
| `devinpleuler/analytics-handbook` | Soccer analytics handbook using StatsBomb open data | linked repo |
| `AkramOM606/AI-SoccerCoach` | Generative AI coaching assistant | `ai-coach-prompts.md` |

## Production Mobile Endpoints

| Endpoint | Capability | Requirements |
|----------|-----------|--------------|
| `POST /api/soccer/ai-coach` | On-device QVAC tactical analysis | QVAC model loaded at app start |
| `POST /api/soccer/ai-chat` | Context-aware on-device coaching chat | QVAC model loaded + TDAI memory |
| `POST /api/soccer/visualize` | Chart-ready data (event summary, shot map, passing network, xG timeline) | Frontend charting library |
| `GET /api/soccer/reference` | Read reference markdowns | Reference files in `apps/mobile-expo/` |
| `POST /api/soccer/import` | Import CSV/JSON notebook outputs into wiki pages | Data pasted/imported as text |
| `POST/GET /api/soccer/llm-config` | Read QVAC model status | — |

**Note:** The app uses the single bundled QVAC model (`LLAMA_3_2_1B_INST_Q4_0`). Users cannot load custom models.

## Wiki Templates

- `templates/match-analysis.md` — narrative post-match report
- `templates/dashboard-template.md` — metrics + chart placeholders
- `templates/xg-analysis.md` — xG-focused shot and chance analysis
- `templates/data-scraping-guide.md` — scraping workflow checklist
- `templates/player-evaluation.md` — individual player assessment
- `templates/tactical-plan.md` — pre-match tactical setup
