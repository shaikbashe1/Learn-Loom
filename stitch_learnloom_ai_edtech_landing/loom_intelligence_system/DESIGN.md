---
name: Loom Intelligence System
colors:
  surface: '#FFFFFF'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
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
  error: '#EF4444'
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
  background: '#F8FAFC'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  text-primary: '#0F172A'
  text-secondary: '#64748B'
  border-base: '#E2E8F0'
  success: '#22C55E'
  warning: '#F59E0B'
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
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  stack-xl: 64px
---

## Brand & Style

This design system is built for a premium, AI-driven educational environment that balances the intellectual rigor of traditional learning with the high-velocity innovation of modern SaaS. The brand personality is **intelligent, supportive, and visionary**.

The visual direction follows a **Modern SaaS** aesthetic with a heavy emphasis on **Glassmorphism**. It utilizes translucency and backdrop blurs to represent the "transparency" of AI processes, while soft, multi-layered shadows provide a sense of physical weight and premium quality. The interface mimics the organized clarity of Notion and the technical precision of Linear, ensuring that students and educators feel focused and empowered rather than overwhelmed.

## Colors

The palette centers on "Trust Blue" as the foundation for educational authority. This is complemented by "AI Cyan" for technical interactions and "Creative Violet" for personalization and premium AI features.

- **Primary (Blue):** Used for main actions, progress indicators, and primary branding.
- **Secondary (Cyan):** Reserved for AI-powered insights, chatbot interfaces, and interactive learning nodes.
- **Tertiary (Violet):** Used for celebratory moments, achievements, and "Pro" tier features.
- **Surface Strategy:** Backgrounds utilize a very light cool gray (#F8FAFC) to reduce eye strain, while cards are pure white (#FFFFFF) to pop against the substrate.

Gradients should be used sparingly for Hero sections or high-impact cards, following a 135-degree linear path from Primary to Secondary to Tertiary.

## Typography

The typographic hierarchy is designed for high legibility during long study sessions. 

- **Headlines:** Hanken Grotesk provides a sharp, contemporary feel that looks professional yet accessible. High-level displays use tighter letter spacing for a "designed" SaaS look.
- **Body:** Inter is the workhorse for all instructional content, chosen for its exceptional readability at various sizes.
- **Labels:** JetBrains Mono is used for metadata, AI status indicators, and "coding" or "technical" notes to differentiate machine-generated info from human-authored content.

## Layout & Spacing

This design system employs a **fluid grid** with strict max-widths for readability. 

- **Grid:** A 12-column grid on desktop, 8-column on tablet, and 4-column on mobile.
- **Rhythm:** An 8px base unit drives all spacing. 
- **Spaciousness:** To mimic the "calm" feel of Notion, use generous vertical padding (`stack-xl`) between major content sections to allow the user's mind to breathe.
- **Content Alignment:** Main reading columns should be centered and restricted to a max-width of 800px to ensure optimal line lengths for learning.

## Elevation & Depth

Depth is communicated through **translucent layering** rather than traditional opaque stacking.

- **Level 0 (Surface):** The #F8FAFC background.
- **Level 1 (Cards):** White (#FFFFFF) with a 1px border (#E2E8F0) and a very soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)`.
- **Level 2 (Glassmorphism/AI Modals):** Surfaces use `rgba(255, 255, 255, 0.7)` with a `backdrop-filter: blur(12px)`. This is strictly for AI overlays, navigation bars, and floating action panels.
- **Interactive Elevation:** On hover, cards should slightly lift by increasing shadow spread and shifting -2px on the Y-axis.

## Shapes

The shape language is friendly but structured. A standard radius of **16px (1rem)** is used for most UI components (buttons, inputs, small cards). Large containers and main dashboard panels use **24px (1.5rem)** to create a soft, modern framing effect.

Interactive elements like tags and chips should utilize a **pill-shape (full radius)** to distinguish them from structural content containers.

## Components

- **Buttons:** Primary buttons use a solid #2563EB with white text. Secondary buttons use a subtle gray ghost style. AI-specific actions should use a gradient border or the Secondary Cyan color.
- **Input Fields:** Large 16px padding with 1px border. Focus states should use a 2px Primary Blue ring with a 4px soft outer glow.
- **Cards:** Used for courses and modules. Must include a 16-24px corner radius. AI-generated cards can feature a subtle Violet-to-Cyan top border (2px).
- **Chips/Badges:** Small, pill-shaped markers. Use Secondary Cyan for "AI Generated" and Tertiary Violet for "Premium Content."
- **Progress Bars:** Thin, 8px height, utilizing the Primary Blue for standard progress and a Cyan/Violet gradient for "Mastery" levels.
- **AI Chat Interface:** Utilize the glassmorphism style with a blurred background to signify that the AI is "floating" over the learning content.