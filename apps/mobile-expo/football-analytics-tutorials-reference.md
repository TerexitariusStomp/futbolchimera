# Football Analytics Tutorials Reference

## Repository Overview
Source: `ricardoherediaj/football-analytics-tutorials`

Open-source tutorials and code snippets for football analytics.

For the high-level index of all integrated repos and templates, see `analytics-reference.md`.

## What's Included

### Match Event Data
- Player actions (passes, shots, tackles)
- Event coordinates on the pitch
- Timestamp and context for each action

### Expected Goals (xG) and Expected Threat (xT)
- See `templates/xg-analysis.md` for practical xG analysis
- xT evaluates how much a pass or carry increases scoring chance

### Interactive Dashboards
- Match dashboard templates
- Visualization of key metrics and event maps

### Web Scraping
- Tutorials for collecting football data from websites
- Ethical scraping practices and rate limiting

## Notebook Index

### match_dashboard_template.ipynb
Create comprehensive match dashboards with shot maps, pass networks, and momentum charts.

### cwc_scraping_test.ipynb
Test scraping workflows for football data sources.

## Mobile Integration Notes

These notebooks are Python-based and cannot run directly on mobile. For mobile use:
- Export generated charts/images from notebooks
- Import CSV/JSON outputs into the app
- Use the dashboard template in the app's wiki to structure insights
- Reference the xG and xT concepts in analysis templates

## Related Templates
- `templates/xg-analysis.md`
- `templates/dashboard-template.md`
- `templates/data-scraping-guide.md`
