---
name: Loom Intelligence
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#632ecd'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d4ce7'
  on-tertiary-container: '#f6edff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  surface-glass: rgba(255, 255, 255, 0.7)
  bg-base: '#F8FAFC'
  success-green: '#10B981'
  warning-amber: '#F59E0B'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
---

## Brand & Style

The design system is an AI-native ecosystem designed for the modern learner. It positions the product as an intelligent companion that is both sophisticated and approachable. The aesthetic is a fusion of **Corporate Modern** efficiency and **Glassmorphism** depth, creating a sense of clarity, foresight, and cognitive ease.

The visual narrative focuses on "Luminous Intelligence"—using light, transparency, and vibrant accents to represent the flow of information. It targets high-achieving students and lifelong learners who require a professional SaaS environment that feels cutting-edge yet reliable. The emotional response should be one of "calm focus" and "empowered mastery."

## Colors

The palette is anchored by a deep **Primary Blue** that signals trust and institutional strength, complemented by **Secondary Cyan** for a high-tech, data-driven feel. **Accent Violet** is reserved for high-value AI interactions and creative milestones.

For neutral tones, we use a sophisticated Slate palette rather than pure blacks to maintain a premium SaaS feel. The system defaults to a light mode with high-transparency surfaces, but maintains WCAG AA contrast ratios by ensuring that all functional text sits on non-transparent overlays or meets a minimum 4.5:1 ratio against the background.

## Typography

This design system uses **Hanken Grotesk** across all levels to maintain a unified, modern, and intelligent identity. The typeface’s geometry is clean enough for data-heavy dashboards while its slight humanist touches keep it approachable for learning environments.

We utilize tight letter spacing on large display sizes to create a "contained" and professional look. For smaller labels and data points, we slightly increase letter spacing to ensure legibility during rapid scanning of dashboards.

## Layout & Spacing

The system follows a strict **8px grid**, ensuring all components and layouts are multiples of 8. This creates a rhythmic, professional harmony across the UI. 

We employ a **Fluid Grid** with fixed maximum containers.
- **Desktop (1440px+):** 12-column grid, 24px gutters, 40px side margins.
- **Tablet (768px - 1439px):** 8-column grid, 20px gutters, 24px side margins.
- **Mobile (<767px):** 4-column grid, 16px gutters, 16px side margins.

Spacing should be generous to allow the AI-generated content "room to breathe," preventing the cognitive overload often associated with complex learning tools.

## Elevation & Depth

Hierarchy is achieved through **Glassmorphism** and **Ambient Shadows**. Instead of traditional solid borders, we use layered surfaces to indicate importance:

1.  **Base Layer:** The light slate background (`#F8FAFC`).
2.  **Card Layer:** Semi-transparent white (`rgba(255, 255, 255, 0.7)`) with a 1px white inner-stroke and a 20px background blur.
3.  **Floating Layer:** High-contrast elements (modals, tooltips) use a more opaque background with a deep, diffused shadow (`0px 20px 40px rgba(15, 23, 42, 0.08)`).

This layering technique mimics the "stacking" of thoughts and ideas, reinforcing the intelligence narrative.

## Shapes

The shape language is consistently **Rounded**. The 0.5rem (8px) base radius ensures that components feel friendly and modern without appearing childish. 

- Use **Base Rounded (8px)** for input fields, small buttons, and list items.
- Use **Large (16px)** for main dashboard cards and container sections.
- Use **Extra Large (24px)** for modal containers and decorative AI interaction zones.
- Use **Pill-shaped** exclusively for status indicators (chips) and primary action buttons to make them instantly recognizable as interactive.

## Components

### Interactive Cards
Cards are the primary unit of the Skill Intelligence Dashboard. They should feature a 1px semi-transparent border and a soft shadow. On hover, cards should subtly lift (translate -4px Y) and increase shadow depth to signal interactivity.

### Data Visualizations
- **Radar Charts:** Use Accent Violet for the primary data area with a 20% opacity fill and a 2px solid stroke.
- **Progress Rings:** Use a Secondary Cyan stroke with a rounded cap. The background track should be a light neutral grey at 10% opacity.

### Buttons & Inputs
- **Primary Button:** Solid Primary Blue with white text. Pill-shaped.
- **AI Action Button:** Gradient from Primary Blue to Secondary Cyan. Reserved for "Generate" or "Analyze" actions.
- **Input Fields:** White background with a subtle 1px Slate-200 border. Focused state uses a 2px Secondary Cyan ring.

### Micro-interactions
- **AI Pulse:** When the system is "thinking," use a subtle breathing animation on the Secondary Cyan accent color.
- **Feedback Loops:** Use soft haptic-like visual transitions (300ms ease-out) for all state changes.