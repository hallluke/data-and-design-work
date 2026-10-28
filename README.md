# Household Waste & Recycling

For a little while now I've been weighing everything I leave out for residential waste and recycling collection because I've been curios about how much I throw away and how much gets recycled, composted or recovered. This interactive visualisation explores the collected data.

[Explore the interactive visualisation](https://hallluke.github.io/data-and-design-work/)

## Design principles

The charts are intended to make the data easier to explore and understand, while being clear about what the measurements can — and can't — tell us.

### <img src="assets/icons/database.svg" width="20" height="20" alt=""> 01. Data integrity and transparency

The measurements tell me how much waste was collected, but not exactly when it was produced. Since weighing everything daily is impractical, the charts distinguish **recorded weights** from **imputed estimates**, distributing measurements across the periods between collections. Complete and provisional months are also identified to avoid presenting incomplete data as definitive.

<sub>Data provenance · Temporal attribution · Uncertainty · Reproducible calculations · Data validation</sub>

### <img src="assets/icons/chart-no-axes-combined.svg" width="20" height="20" alt=""> 02. Appropriate visual encoding

Each chart explores a different aspect of the data. Bars compare monthly quantities and material contributions, slopes show year-on-year changes, the doughnut communicates the overall recycling rate, and the calendar reveals daily patterns.

<sub>Quantitative comparison · Part-to-whole relationships · Temporal patterns · Fit-for-purpose chart selection</sub>

### <img src="assets/icons/palette.svg" width="20" height="20" alt=""> 03. Semantic consistency and redundant encoding

Materials retain consistent colours and terminology across charts, helping readers recognise the same categories in different contexts. Labels, numerical values and supporting tables provide alternative ways to understand information without relying on colour alone.

<sub>Consistent visual grammar · Categorical colour systems · Colour-independent communication · Accessible contrast</sub>

### <img src="assets/icons/sliders-horizontal.svg" width="20" height="20" alt=""> 04. Adaptive controls and error prevention

Interactive controls respond to the available data and current selection, disabling incompatible options rather than allowing misleading or meaningless combinations. Related materials are grouped and visually nested to make the choices easier to understand.

<sub>Constraint-based interaction · Error prevention · Immediate feedback · Hierarchical navigation</sub>

### <img src="assets/icons/layers.svg" width="20" height="20" alt=""> 05. Progressive disclosure and visual hierarchy

The charts provide an immediate overview, with expandable data tables and methodology for anyone who wants to investigate further. Clear spacing, restrained decoration and proximity keep related information together without crowding the initial view.

<sub>Overview first, details on demand · Gestalt proximity · Reduced cognitive load · Analytical transparency</sub>

### <img src="assets/icons/door-open.svg" width="20" height="20" alt=""> 06. Accessible and responsive interaction

The charts are designed for mouse, keyboard and touch, with visible focus indicators, consistent selection behaviour and contextual feedback. Responsive layouts adapt the charts, controls and legends to different screen sizes while preserving their functionality.

<sub>Keyboard accessibility · Focus management · Input independence · Responsive design · Touch usability</sub>

## How it works

The records live in a private **Google Sheet**. A **Python** pipeline checks and processes the data, calculates estimates and summaries, and publishes validated **JSON** through **GitHub Actions**. The static site uses **JavaScript**, **Observable Plot** and **D3** to build the charts, with **HTML and CSS** for layout and presentation, hosted on **GitHub Pages**.

**Google Sheets → Python → JSON → JavaScript / Observable Plot / D3 → HTML & CSS**

More detail on the calculations and publishing process is in [PIPELINE.md](PIPELINE.md).
