# Edd Webster Football Analytics Reference

## Repository Overview
Source: `eddwebster/football_analytics`

A curated collection of football analytics projects, data, notebooks, dashboards, and publicly available resources from the football analytics community.

## Repository Structure

### `notebooks/`
Jupyter notebooks organized by topic:
- `1_data_scraping` - Web scraping techniques
- `2_data_parsing` - Parsing raw data formats
- `3_data_engineering` - Data cleaning and transformation
- `4_data_unification` - Combining multiple data sources
- `5_data_analysis_and_projects` - Analysis projects and visualizations

### `data/`
Sample datasets from various providers.

### `dashboards/`
Tableau and other dashboard examples.

### `scripts/`
Reusable Python scripts.

### `research/`
Papers, articles, and research notes.

### `docs/`
Documentation including data dictionaries and provider notes.

## Key Data Providers Referenced

### Event Data
- StatsBomb
- Opta
- Wyscout
- Metrica Sports
- StrataBet

### Aggregate Statistics
- FBref
- Transfermarkt
- Understat
- Football-data.co.uk

### Tracking Data
- Metrica Sports Open Data
- SkillCorner
- Tracab

## Useful Libraries
- `mplsoccer` - Soccer pitch visualizations
- `statsbombpy` - StatsBomb data access
- `kloppy` - Standardized event/tracking data loaders
- `pandas` - Data manipulation
- `numpy` / `scipy` - Numerical computing
- `scikit-learn` - Machine learning

## Mobile Integration Notes

This repository is large and Python-focused. For mobile-only use:
- Use it as a reference for data sources and methods
- Copy relevant data dictionaries and provider notes
- Run notebooks on a desktop and import outputs to the mobile app
- Use the provided wiki templates to structure imported analysis

## Related Templates
- `templates/data-scraping-guide.md`
- `templates/dashboard-template.md`
- `templates/xg-analysis.md`
