# Household Waste & Recycling

For a while I've been weighing the waste I put out for collection at home, out of curiosity about how much I throw away and how much gets recycled, composted or recovered. I've been collecting the data since 2025, and this interactive visualisation explores the results through monthly totals, recycling rates, year-on-year comparisons and daily patterns.

[Explore the interactive visualisation](https://hallluke.github.io/data-and-design-work/)

## Making sense of the data

The measurements tell me how much was collected, but not exactly when that waste was produced. It's impractical to weigh each material every day, so the charts distinguish **recorded weights** from **imputed ones** — estimates that distribute each measurement across the days since the previous record. They also distinguish complete months from provisional ones, where some measurements are still missing.

Each chart includes a data table and an explanation of its methodology, making it possible to examine the figures and understand how they were calculated.

## Making it easy to use

The four charts share a consistent visual language, with related colours, terminology and controls that adapt to the available data. The design aims to keep attention on the information, using clear visual hierarchy, restrained decoration and proximity to connect values with the things they describe.

Responsive layouts adapt to desktop and mobile screens, while interactions are designed for mouse, keyboard and touch. Keyboard navigation, visible focus indicators, accessible controls and consistent selection behaviour are all part of the design, rather than separate additions.

## How it works

The records live in a private **Google Sheet**. A **Python** pipeline checks and processes the data, calculates estimates and summaries, and publishes validated **JSON** through **GitHub Actions**. The static site uses **JavaScript**, **Observable Plot** and **D3** to build the charts, with **HTML and CSS** for layout and presentation, hosted on **GitHub Pages**.

**Google Sheets → Python → JSON → JavaScript / Observable Plot / D3 → HTML & CSS**

More detail on the calculations and publishing process is in [PIPELINE.md](PIPELINE.md).
