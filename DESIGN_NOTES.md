# Design Notes — Household Waste & Recycling

A record of data, information-design, interaction and engineering decisions in the [Household Waste & Recycling visualisation](https://hallluke.github.io/data-and-design-work/).

## 1. Data collection, interpretation and methodology

| Decision | Action and rationale | Principle / summary phrase |
|---|---|---|
| Personal longitudinal dataset | Household waste and recycling are recorded over time to reveal changes and patterns rather than relying on a single snapshot. | Longitudinal analysis; evidence over time |
| Material-level recording | Separate material categories are retained so their contributions can be analysed independently or together. | Data granularity; analytical flexibility |
| Recorded vs imputed data | Actual collection measurements are distinguished from estimates assigned to dates between measurements. | Data provenance; transparency about estimation |
| Interval-based imputation | Collected weights are distributed across the periods since the previous records rather than assigned entirely to collection dates. | Explicit modelling assumptions; temporal attribution |
| Daily and monthly aggregation | The underlying measurements support different time resolutions and analytical questions. | Appropriate aggregation; multiple analytical perspectives |
| Complete vs provisional months | Months with complete collection coverage are distinguished from those still awaiting measurements. | Communicating uncertainty and data completeness |
| Provisional estimates | Available historical information supports provisional estimates for incomplete periods, with their status identified. | Qualified estimates; avoiding false certainty |
| Missing data vs zero | Absent measurements are not automatically interpreted as evidence that no waste was generated. | Absence is not zero; data integrity |
| Material definitions | Material identities and groupings are maintained consistently through processing and presentation. | Controlled vocabulary; semantic consistency |
| Input validation | Source fields, dates, materials and weights are checked before publication. | Data quality assurance; fail-fast validation |
| Generated summaries | Derived figures are calculated through a repeatable Python process rather than manually edited. | Reproducibility; single source of truth |
| Publication validation | Generated output is checked before publication to reduce malformed or inconsistent data reaching the site. | Reliable pipelines; defensive publishing |
| Private source, public results | The source spreadsheet remains private while processed JSON is published. | Separation of source and presentation; controlled disclosure |
| Documented methodology | Calculations and interpretation are available for readers who want to investigate the results. | Analytical transparency; explainability |

## 2. Chart selection and visual encoding

| Decision | Action and rationale | Principle / summary phrase |
|---|---|---|
| Four complementary views | Monthly bars, year-on-year slopes, a doughnut and a daily calendar address different questions about the same dataset. | Fit-for-purpose visual encoding |
| Bar lengths for quantities | Bars represent monthly weights, allowing magnitudes and changes to be compared. | Accurate quantitative comparison |
| Stacked composition | Materials are displayed as contributions to an overall total. | Part-to-whole analysis |
| Stacked vs total toggle | Alternative presentations are offered without duplicating charts. | Flexible analytical perspective |
| Slope chart for year-on-year change | Values across two years are connected to emphasise the direction and magnitude of changes by material. | Change-focused comparison |
| Doughnut for recycling rate | A compact part-to-whole visual communicates the overall recycling proportion. | Match chart type to analytical task |
| Calendar heat-map for daily patterns | Daily weights are displayed within a familiar calendar structure to reveal temporal patterns. | Temporal context; pattern recognition |
| Consistent visual conventions | Colours, labels and other graphical elements are used predictably within each chart. | Semantic consistency |
| Related colour families | Related materials use related colours to reinforce their grouping. | Visual grouping; categorical hierarchy |
| Complete/provisional distinction | Different visual treatments communicate the completeness of the data. | Encode data quality, not just value |
| Restrained palette | Unnecessary competing colours are avoided so meaningful differences remain noticeable. | Visual economy; signal over decoration |
| Labels and numerical values | Textual information supplements graphical marks and visual estimates. | Redundant encoding |
| Contextual legends | Legends reflect the active presentation and omit redundant information where appropriate. | Contextual relevance; reduced visual clutter |
| Consistent chart presentation | Typography, spacing, headings and visual conventions are reused across charts. | Consistent visual grammar |

## 3. Controls, navigation and information hierarchy

| Decision | Action and rationale | Principle / summary phrase |
|---|---|---|
| Adaptive controls | Available options change according to the selected material and measurement type. | Constraint-based interaction; error prevention |
| Disabled incompatible options | Invalid or meaningless combinations are prevented rather than producing confusing results. | Error prevention; valid states by design |
| Material grouping | Individual materials are organised into broader categories to simplify navigation. | Information architecture; meaningful grouping |
| Parent/child visual hierarchy | Indentation and presentation distinguish material groups from their members. | Visual hierarchy; hierarchical navigation |
| Controls near their charts | Filters and display options are positioned alongside the visualisations they affect. | Spatial proximity; clear relationships |
| Consistent control conventions | Similar actions use familiar selectors and button groups across charts. | Consistency and standards |
| Immediate updates | Charts update following control changes so the effect of each selection is apparent. | Visibility of system status; immediate feedback |
| Context-sensitive legends | Legends reflect the current view rather than listing irrelevant categories. | Relevant information at the point of use |
| Progressive disclosure | Data tables and methodology are available on demand without crowding the charts. | Layered information; overview first, detail on demand |
| Disclosure emphasis | Chart titles remain visually prominent while methodology and supporting explanations use more restrained styling, allowing readers to distinguish primary findings from optional detail. | Information hierarchy; progressive disclosure; visual salience |
| Scrollable data tables | Underlying numerical values can be inspected without requiring a separate page or export. | Multiple representations; access to source figures |
| Contextual methodology | Calculations are explained alongside the charts where their results appear. | Contextual explanation; interpretability |
| Avoidance of unnecessary controls | Redundant or meaningless options are omitted for particular selections. | Reduced cognitive load; simplified choices |

## 4. Accessibility and interaction design

| Decision | Action and rationale | Principle / summary phrase |
|---|---|---|
| Mouse, keyboard and touch support | Chart information is available through different input methods. | Input independence; inclusive interaction |
| Keyboard-operable chart marks | Bars, slopes and other interactive elements can be inspected without a pointer. | Keyboard accessibility |
| Visible focus indicators | The current keyboard position is visually identified. | Focus visibility; orientation |
| Escape dismisses temporary details | Tooltips can be closed without losing keyboard focus. | Predictable dismissal; focus persistence |
| Input-appropriate touch dismissal | Tapped selections persist until another action or a tap outside the chart, instead of following mouse-hover behaviour. | Input-appropriate interaction |
| Touch-scroll distinction | Touch gestures intended to scroll are distinguished from taps intended to inspect data. | Gesture disambiguation; error prevention |
| Consistent selection feedback | Highlighting connects the inspected value with the corresponding chart mark. | Visibility of system status |
| Shared slope selection logic | Mouse and touch use the same nearest-slope calculation with input-appropriate tolerances. | Consistent interaction semantics |
| Chart-specific hit testing | Selection geometry reflects the shapes of bars, slopes, arcs and calendar cells. | Appropriate interaction targets |
| Slope proximity threshold | Selection requires reasonable proximity to a line to reduce accidental activation. | Error prevention; predictable targeting |
| Keyboard slope order | Focus order follows plotted values rather than arbitrary source-data order. | Logical navigation order |
| Calendar arrow-key navigation | Spatial navigation supports movement between calendar dates. | Efficient keyboard interaction |
| Calendar month/week navigation | Additional navigation and scrolling support exploration of a large calendar. | Efficient navigation; spatial orientation |
| Reversible calendar navigation | Restoring the original fifth weekday after a month jump was considered to make immediately reversed navigation more intuitive. The existing ordinal-based behaviour was retained because its consistent rules were considered more valuable than accommodating an uncommon exception. | Predictability vs reversibility; spatial mental models |
| Persistent selection highlighting | Inspected marks remain identifiable while their details are shown. | Clear feedback; focus–context relationship |
| Independent focus and inspection | Keyboard navigation can move between data points without automatically reopening dismissed details. Users can choose when to inspect a value while retaining their position in the visualisation. | User control; separation of navigation and exploration |
| Stable contextual information | Tooltips use predictable placement appropriate to the input method, avoiding unnecessary movement or obscuring small chart areas during inspection. | Spatial stability; reduced cognitive load; focus–context relationship |
| Tooltips near marks | Contextual values appear close to the corresponding data points. | Spatial proximity; reduced visual search |
| Tooltip boundary handling | Tooltip placement accounts for chart and viewport edges. | Robust responsive interaction |
| <abbr title="Accessible Rich Internet Applications">ARIA</abbr> labels | Chart regions and interactive elements receive descriptive accessible names. | Programmatic accessibility; accessible names |
| Accessible data tables | Numerical tables provide another representation of the chart information. | Equivalent information; multimodal access |
| Scrollable-table focus handling | Overflowing table regions can be reached and navigated by keyboard where necessary. | Keyboard access to overflow content |
| Redundant encoding | Text, values and other cues supplement colour. | Colour-independent communication |
| Colour contrast and typography | Legibility, contrast and focus visibility inform the presentation. | Perceptibility; visual accessibility |

## 5. Responsive and visual design

| Decision | Action and rationale | Principle / summary phrase |
|---|---|---|
| Responsive chart layouts | Chart dimensions and surrounding content adjust to narrower screens. | Responsive information design |
| Mobile control arrangements | Controls are reorganised where appropriate instead of merely shrinking the desktop layout. | Adaptive layout; mobile usability |
| Responsive legends | Material keys remain compact and readable on smaller screens. | Efficient use of available space |
| Calendar horizontal scrolling | The calendar retains useful cell sizes instead of compressing every day into a narrow viewport. | Preserve information density; controlled overflow |
| Compact tooltips | Tooltip dimensions follow their content rather than using oversized fixed panels. | Content-driven sizing; visual economy |
| Consistent spacing | Gaps, alignment and widths are coordinated across the interface. | Alignment; visual rhythm |
| Clear typography | Typographic differences distinguish headings, controls, chart labels and supporting information. | Readability; visual hierarchy |
| Restrained decoration | Nonessential visual elements are limited so attention remains on the data. | Signal-to-noise ratio |
| Alternating colours | Blue and orange alternate between charts to create visual rhythm and distinguish adjacent panels without implying differences in the underlying data. The contrasting hues were also chosen for their relative distinguishability and their weaker associations with culturally established valence compared with other common choices, such as red and green. | Visual grouping; perceptual discriminability; colour accessibility; semantic neutrality |
| Proximity and grouping | Related labels, controls, legends and values are placed together. | Gestalt proximity; perceptual grouping |
| Visual continuity | Layout patterns and styling are reused while allowing chart-specific structures. | Design-system consistency |

## 6. Engineering and maintainability

| Decision | Action and rationale | Principle / summary phrase |
|---|---|---|
| Google Sheets as source | Measurements are recorded in a familiar interface without a custom data-entry application. | Appropriate tooling; low-friction collection |
| Python processing pipeline | Cleaning, calculations and aggregation are separated from browser-side presentation. | Separation of concerns |
| JSON data contract | Structured data is published for consistent use by the charts. | Decoupled data and presentation |
| Automated GitHub Actions | Processing and publication are automated rather than dependent on manual updates. | Reproducible workflow; automation |
| Static website | GitHub Pages hosts the visualisation without a dedicated application server. | Lightweight architecture; low maintenance |
| Observable Plot and D3 | Higher-level plotting and customised geometry are used where appropriate. | Appropriate abstraction; fit-for-purpose tools |
| Individual chart modules | Chart-specific geometry and behaviour remain separate. | Modularity; single responsibility |
| Shared chart utilities | Lifecycle, formatting, controls, tooltips and common interactions are consolidated. | Reusability; <abbr title="Don't Repeat Yourself">DRY</abbr> principle |
| Central material registry | Category definitions remain consistent across the application. | Single source of truth |
| Explicit event cleanup | Registered listeners are removed when chart instances are destroyed. | Lifecycle management; resource hygiene |
| Automated tests | Python processing and JavaScript behaviours have automated regression coverage. | Regression prevention; verifiability |
| Documented pipeline | The data-processing and publishing workflow is described separately from the public introduction. | Maintainability; reproducibility |

---

*Not all of these principles made it in to the final version of the site, but they were all considered at some point during development*
