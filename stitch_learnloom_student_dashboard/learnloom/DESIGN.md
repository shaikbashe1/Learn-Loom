---
name: LearnLoom
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#451f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
  surface-lowest: '#0e0e10'
  surface-low: '#1c1b1d'
  outline-muted: '#464554'
  gold-tier: '#ffb783'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.05em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  gutter: 1.5rem
  margin: 2rem
---

## Brand & Style
LearnLoom is a premium EdTech platform designed for high-performance learners and developers. The brand personality is **Technical, Focused, and Prestigious**. It combines the precision of developer tools with the motivating atmosphere of a high-stakes gaming dashboard.

The visual style is **Corporate Modern with Glassmorphism accents**. It utilizes a "Deep Tech" dark mode aesthetic characterized by high-fidelity color tokens, subtle translucency (backdrop blurs in headers), and glow effects on progress indicators to emphasize achievement and forward momentum.

## Colors
The palette is built on a **Fidelity Dark** model. 
- **Primary (Indigo-Vivid):** Used for primary actions, branding, and active navigational states.
- **Secondary (Purple-Deep):** Reserved for advanced AI features and specialized course modules.
- **Tertiary (Amber/Orange):** Indicates streaks, prestige (Gold Tier), and high-energy milestones.
- **Neutrals:** A range of deep charcoals and soft greys. The background is almost black (`#131315`), with containers stepping up in lightness to create structural hierarchy.
- **Functional Colors:** Error states use a soft coral-red (`#ffb4ab`) to maintain readability against dark backgrounds without being jarring.

## Typography
The system uses a dual-font approach to balance human-centric learning with technical precision. 
- **Geist** is the primary typeface for headings and body, providing a clean, Swiss-inspired aesthetic that feels modern and approachable.
- **JetBrains Mono** is used for labels, metadata, and progress metrics. This choice reinforces the "technical mastery" aspect of the platform.
- **Scale:** Aggressive letter-spacing reductions are applied to large display text (`-0.05em`) to maintain a tight, editorial look.

## Layout & Spacing
The layout follows a **Hybrid Grid System**:
- **Navigation:** A fixed 64px (desktop) or hidden (mobile) sidebar.
- **Canvas:** A centered fluid container with a `max-width` of 1440px. 
- **Rhythm:** An 8px base unit drives all spacing. Content sections are separated by `xl` (32px) or `2xl` (48px) gaps to prevent visual clutter in a data-dense environment.
- **Bento Grid:** The "Continue Learning" and "Stats" sections utilize a responsive grid that collapses from 3 or 2 columns down to 1 on mobile devices.

## Elevation & Depth
Depth is expressed through **Tonal Layering and Tactical Glows**:
- **Level 0 (Background):** `#131315` (Deepest).
- **Level 1 (Cards/Containers):** `#0e0e10` or `#1c1b1d` with a subtle `#464554` border (60% opacity).
- **Interactive Depth:** Hovering over cards increases border brightness and introduces subtle scale transforms (98% or 102%).
- **Special Elevation:** The top navigation bar uses a `backdrop-blur-md` with 80% opacity, allowing content to scroll beneath it while maintaining context. 
- **Glows:** High-priority progress bars utilize a soft outer glow (`shadow-[0_0_8px_rgba(primary)]`) to draw the eye to completion states.

## Shapes
The shape language is **Structured but Approachable**.
- **Cards & Banners:** Use `rounded-xl` (1.5rem) to soften the technical aesthetic.
- **Standard Buttons & Inputs:** Use `rounded-lg` (1rem) for a balanced interactive feel.
- **Status Chips & Search:** Use `full` (pill-shaped) to distinguish them from structural elements.
- **Avatars/Icons:** Generally circular or slightly rounded-md (8px) for consistency with the font geometry.

## Components
- **Buttons:** Primary buttons use solid fills (`bg-primary`) with bold text. Secondary buttons use a surface-container-high background with a defined border to maintain hierarchy.
- **Inputs:** Search fields must be pill-shaped with an inset icon and a subtle border that transitions to primary-color on focus.
- **Progress Bars:** Thin (6px) tracks with rounded caps. Use `primary` for general progress and `secondary` for specialized (AI) modules.
- **Cards:** All cards must feature a 1px border. "Quick Stats" cards use a fixed height (32px/8rem) for horizontal alignment, while "Course Cards" expand vertically on mobile.
- **Navigation Links:** Active states are indicated by a 10% opacity background of the primary color and a slight horizontal translation (`translate-x-1`) to show "active focus."