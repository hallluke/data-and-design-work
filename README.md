# Household Waste & Recycling

For a little while now I've been weighing everything I leave out for residential waste and recycling collection because I've been curios about how much I throw away and how much gets recycled, composted or recovered. This interactive visualisation exists to explore the collected data.

[Explore the interactive visualisation](https://hallluke.github.io/data-and-design-work/)

## Making sense of the data

The measurements tell me how much was collected, but not exactly when that waste was produced. It's impractical to weigh everything each day, so the charts distinguish **recorded weights** from **imputed ones** — estimates that distribute the measurement across the days since the previous record. They also distinguish complete months from provisional ones, where some measurements are still missing.

Each chart includes a data table and an explanation of its methodology, making it possible to examine the figures, understand how they were calculated and the reasoning behind those choices.

## Making it easy to use

The four charts share a consistent visual language, with related colours, terminology and controls that adapt to the available data. The design aims to keep attention on the information, using clear visual hierarchy, restrained decoration and proximity to connect values with the things they describe, alongside accessible colour contrast, legible typography and visible focus indicators.

Responsive layouts adapt to desktop and mobile screens, while interactions are designed for mouse, keyboard and touch. Keyboard navigation, visible focus indicators, accessible controls and consistent selection behaviour are intrinsic to the design.

## How it works

The records live in a private **Google Sheet**. A **Python** pipeline checks and processes the data, calculates estimates and summaries, and publishes validated **JSON** through **GitHub Actions**. The static site uses **JavaScript**, **Observable Plot** and **D3** to build the charts, with **HTML and CSS** for layout and presentation, hosted on **GitHub Pages**.

**Google Sheets → Python → JSON → JavaScript / Observable Plot / D3 → HTML & CSS**

More detail on the calculations and publishing process is in [PIPELINE.md](PIPELINE.md).
