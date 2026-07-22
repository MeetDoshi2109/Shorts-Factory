---
name: Obsidian Flux
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#ebbbb4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#b18780'
  outline-variant: '#603e39'
  surface-tint: '#ffb4a8'
  primary: '#ffb4a8'
  on-primary: '#690100'
  primary-container: '#ff5540'
  on-primary-container: '#5c0000'
  inverse-primary: '#c00100'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930100'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  sidebar-width: 260px
  gutter: 16px
---

## Brand & Style
The design system is engineered for professional creators and agency owners managing high-volume content pipelines. The brand personality is clinical, efficient, and powerful, prioritizing data density without sacrificing visual sophistication. 

The aesthetic merges **Minimalism** with subtle **Glassmorphism**. By using a "Modern Dark Mode" foundation, the system reduces eye strain during long analytical sessions while allowing high-contrast accents to guide the user's attention toward critical status changes and performance metrics. The emotional response should be one of total control and technical reliability.

## Colors
The palette is rooted in an "Obsidian" base to create infinite depth. 
- **Primary (#FF0000):** Reserved strictly for primary calls to action, active states, and brand-critical touchpoints.
- **Success/Warning/Error:** Standardized functional colors for "Uploaded" (Emerald), "Processing" (Amber), and "Failed" (Red).
- **Surface Tiers:** Backgrounds use `#050505`, while interactive cards and panels use `#1A1A1A` to create a clear visual hierarchy through tonal layering.
- **Translucency:** Glassmorphic elements utilize white overlays at 4-8% opacity to simulate frosted surfaces over deep backgrounds.

## Typography
This design system employs **Inter** for all primary UI text to ensure maximum legibility in data-heavy environments. **JetBrains Mono** is introduced as a secondary functional font for metadata, status labels, and numerical data points to lean into the technical, automated nature of the tool.

- **Scale:** High contrast between display titles and body text.
- **Density:** Body text is sized at 14px for optimal information density on dashboards.
- **Tracking:** Tightened letter spacing on larger headlines for a more premium, engineered feel.

## Layout & Spacing
The layout utilizes a **Fixed Grid** approach for the main content area (max-width 1440px) with a persistent left-hand sidebar navigation. 

- **Grid:** 12-column layout on desktop with 16px gutters.
- **Sidebar:** A collapsed state (72px) and expanded state (260px) are required. 
- **Rhythm:** A strict 4px baseline grid ensures vertical alignment across disparate data widgets.
- **Responsive:** On mobile, margins reduce to 16px and the sidebar transitions to a bottom navigation bar or a hidden drawer.

## Elevation & Depth
Elevation is achieved through a combination of **Tonal Layers** and **Glassmorphism**, avoiding traditional heavy shadows.

- **Level 0 (Background):** Deepest black (#050505), used for the main application canvas.
- **Level 1 (Cards/Panels):** Charcoal (#1A1A1A) with a 1px solid border at 8% white opacity.
- **Level 2 (Modals/Popovers):** Glassmorphic surfaces with a 12px backdrop blur and a slight white-to-transparent linear gradient border (top-left to bottom-right) to simulate light catching the edge of a lens.
- **Shadows:** Only used for high-level overlays (modals). Use a tight, 20% opacity black shadow with a 32px blur to separate the modal from the background content.

## Shapes
The shape language is "Soft-Industrial." Corners are clipped with small radii to maintain a high-tech, precise feel without appearing overly aggressive or "blocky."

- **Standard Elements:** 4px (0.25rem) radius for buttons, input fields, and small badges.
- **Containers:** 8px (0.5rem) radius for dashboard cards and panels.
- **Interactive States:** On hover, card borders should transition from 8% white to 20% white to provide subtle feedback.

## Components
- **Buttons:** Primary buttons are solid YouTube Red (#FF0000) with white text. Secondary buttons use a ghost style (border-only) or charcoal fill.
- **Status Badges:** 
    - *Processing:* Amber text on a low-opacity amber background (8% fill).
    - *Uploaded:* Emerald text on a low-opacity emerald background.
    - *Failed:* Red text on a low-opacity red background.
- **Charts:** Line graphs should use a 2px stroke width. The area under the line should have a subtle gradient fade. Use primary red for the main metric and neutral grays for comparison data.
- **Input Fields:** Dark charcoal backgrounds with a 1px border. Focus state triggers a primary red border glow.
- **Sidebar:** Icons should be stroke-based (2px weight) for clarity. The active state uses a primary red vertical indicator on the left edge.
- **Data Tables:** Row hover states use a subtle 4% white overlay. Use JetBrains Mono for all numerical figures within table cells.