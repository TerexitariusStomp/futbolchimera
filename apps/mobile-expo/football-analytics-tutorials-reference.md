# Football Analytics Tutorials Reference

## Repository Overview
Source: `ricardoherediaj/football-analytics-tutorials`

Open-source tutorials and code snippets for football analytics.

## What's Included

### Match Event Data
- Player actions (passes, shots, tackles)
- Event coordinates on the pitch
- Timestamp and context for each action

### Expected Goals (xG)
- Model the probability of a shot resulting in a goal
- Factors: shot location, body part, assist type, defensive pressure

### Expected Threat (xT)
- Evaluate how much a pass or carry increases the chance of scoring
- Useful for identifying progressive actions

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
