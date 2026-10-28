# Household Waste & Recycling

**A small personal data project about how everyday information can be made useful, understandable and enjoyable to explore.**

I like data. I also like recycling. So I started weighing the waste and recycling I put out for collection at home. The resulting dataset isn't particularly glamorous, but that's part of the appeal: it provides an opportunity to focus on the design of the information rather than the spectacle of the subject matter.

[Explore the interactive dashboard](https://hallluke.github.io/data-and-design-work/)

## From measurements to meaning

The dashboard uses four complementary views: monthly weights by material, a year-on-year comparison, an overall recycling rate and a calendar of daily collection records. Each answers a slightly different question without requiring the visitor to learn a new visual language every time.

A key design decision was to distinguish **when waste was collected** from **when it likely accumulated**. Recorded figures show weights on collection dates; imputed figures distribute them across the preceding collection interval. The comparison also identifies provisional estimates rather than presenting incomplete periods as definitive. Explanations and underlying data tables accompany the charts so that the assumptions remain visible.

## Designing the experience

The charts are deliberately relatively simple. Much of the work went into making them coherent and usable as a set:

- **Consistent visual language:** shared colours, controls, legends, labels and tooltip patterns across different chart types.
- **Different ways to explore:** mouse, keyboard and touchscreen interactions designed around the strengths of each input method, rather than assuming that hover works everywhere.
- **Keyboard accessibility:** navigable chart elements, visible focus indicators and Escape to dismiss temporary information without losing keyboard position.
- **Responsive presentation:** layouts, legends and tooltips adapted for narrow screens without sacrificing the information available on desktop.
- **Progressive detail:** concise charts first, with explanatory disclosures and accessible tables for people who want to examine the figures or methodology more closely.

The aim wasn't to make the most elaborate charts possible. It was to make modest charts that communicate clearly, reward exploration and behave predictably.

## How it works

The source data is maintained in a private **Google Sheet**. A **Python** pipeline retrieves the collection records, checks and transforms them, calculates summaries and provisional estimates, and publishes validated **JSON** datasets through **GitHub Actions**.

The static site then loads those datasets using modular **JavaScript**. **Observable Plot** and **D3** provide the visualisations, while **HTML and CSS** handle the surrounding structure, responsive layout and presentation. The site is hosted on **GitHub Pages**, with no application server required.

**Google Sheets → Python → validated JSON → JavaScript / Observable Plot / D3 → HTML & CSS**

For the data definitions, calculations, validation and automated publishing process, see [PIPELINE.md](PIPELINE.md).

## About this project

This is a personal portfolio project exploring the overlap between data analysis, visualisation and information design. It brings together the less visible parts of making a dashboard — data quality, uncertainty, interaction details, accessibility and consistency — as well as the finished charts.
