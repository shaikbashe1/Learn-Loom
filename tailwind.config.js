import tailwindAnimate from 'tailwindcss-animate';
import containerQuery from '@tailwindcss/container-queries';
import intersect from 'tailwindcss-intersect';

export default {
    darkMode: ['class'],
    content: [
        './index.html',
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './node_modules/streamdown/dist/**/*.js'
    ],
    safelist: ['border', 'border-border'],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                borderColor: {
                    border: 'hsl(var(--border))'
                },
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: '#131315',
                foreground: '#e5e1e4',
                primary: {
                    DEFAULT: '#c0c1ff',
                    foreground: '#1000a9'
                },
                secondary: {
                    DEFAULT: '#ddb7ff',
                    foreground: '#490080'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                education: {
                    blue: 'hsl(var(--education-blue))',
                    green: 'hsl(var(--education-green))'
                },
                success: 'hsl(var(--success))',
                warning: 'hsl(var(--warning))',
                info: 'hsl(var(--info))',
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    background: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                },
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
                // Stitch Custom Colors (Updated to Light Mode SaaS Design)
                "on-tertiary-container": "#f6edff",
                "surface-bright": "#f8f9ff",
                "inverse-surface": "#213145",
                "error-container": "#ffdad6",
                "on-primary": "#ffffff",
                "surface-dim": "#cbdbf5",
                "primary-container": "#2563eb",
                "inverse-primary": "#b4c5ff",
                "on-secondary-fixed": "#001f26",
                "surface-variant": "#d3e4fe",
                "tertiary-fixed-dim": "#d0bcff",
                "on-primary-container": "#eeefff",
                "error": "#EF4444",
                "outline": "#737686",
                "on-tertiary-fixed": "#23005c",
                "on-error": "#ffffff",
                "surface-tint": "#0053db",
                "surface-container-low": "#eff4ff",
                "surface": "#FFFFFF",
                "on-primary-fixed": "#00174b",
                "success": "#22C55E",
                "on-secondary-fixed-variant": "#004e5c",
                "secondary": "#00687a",
                "text-secondary": "#64748B",
                "text-primary": "#0F172A",
                "primary-fixed": "#dbe1ff",
                "on-tertiary-fixed-variant": "#5516be",
                "on-primary-fixed-variant": "#003ea8",
                "on-secondary-container": "#006172",
                "surface-container-highest": "#d3e4fe",
                "tertiary-container": "#7d4ce7",
                "surface-container-high": "#dce9ff",
                "on-secondary": "#ffffff",
                "tertiary-fixed": "#e9ddff",
                "on-background": "#0b1c30",
                "border-base": "#E2E8F0",
                "inverse-on-surface": "#eaf1ff",
                "secondary-fixed": "#acedff",
                "outline-variant": "#c3c6d7",
                "primary": "#004ac6",
                "on-surface": "#0b1c30",
                "tertiary": "#632ecd",
                "background": "#F8FAFC",
                "on-error-container": "#93000a",
                "on-tertiary": "#ffffff",
                "on-surface-variant": "#434655",
                "primary-fixed-dim": "#b4c5ff",
                "warning": "#F59E0B",
                "secondary-container": "#57dffe",
                "secondary-fixed-dim": "#4cd7f6",
                "surface-container-lowest": "#ffffff",
                "surface-container": "#e5eeff"
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                // Stitch Custom
                "DEFAULT": "0.25rem",
                "xl": "0.75rem",
                "full": "9999px",
                "3xl": "24px"
            },
            spacing: {
                "base": "4px",
                "xl": "2rem",
                "gutter": "1.5rem",
                "sm": "0.5rem",
                "md": "1rem",
                "margin": "2rem",
                "lg": "1.5rem",
                "xs": "0.25rem",
                "2xl": "3rem",
                // Stitch Custom Spacing
                "stack-xl": "64px",
                "stack-lg": "32px",
                "stack-sm": "8px",
                "margin-desktop": "40px",
                "stack-md": "16px",
                "container-max": "1280px",
                "margin-mobile": "16px"
            },
            fontFamily: {
                "headline-lg-mobile": ["Hanken Grotesk", "sans-serif"],
                "label-md": ["JetBrains Mono", "monospace"],
                "headline-lg": ["Hanken Grotesk", "sans-serif"],
                "body-sm": ["Inter", "sans-serif"],
                "headline-md": ["Hanken Grotesk", "sans-serif"],
                "label-sm": ["JetBrains Mono", "monospace"],
                "body-lg": ["Inter", "sans-serif"],
                "body-md": ["Inter", "sans-serif"],
                "display": ["Hanken Grotesk", "sans-serif"],
                "display-lg-mobile": ["Hanken Grotesk", "sans-serif"],
                "display-lg": ["Hanken Grotesk", "sans-serif"],
            },
            fontSize: {
                "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
                "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.02em", "fontWeight": "500" }],
                "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
                "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
                "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
                "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.04em", "fontWeight": "500" }],
                "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
                "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                "display": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.05em", "fontWeight": "700" }],
                "display-lg-mobile": ["36px", {"lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
            },
            backgroundImage: {
                'gradient-primary': 'var(--gradient-primary)',
                'gradient-card': 'var(--gradient-card)',
                'gradient-background': 'var(--gradient-background)'
            },
            screens: {
                'xs': '480px'
            },
            boxShadow: {
                card: 'var(--shadow-card)',
                hover: 'var(--shadow-hover)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'slide-in': {
                    from: { opacity: '0', transform: 'translateX(-20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' }
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-in': 'slide-in 0.5s ease-out',
                'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }
        }
    },
    plugins: [
        tailwindAnimate,
        containerQuery,
        intersect,
        function ({addUtilities}) {
            addUtilities(
                {
                    '.border-t-solid': {'border-top-style': 'solid'},
                    '.border-r-solid': {'border-right-style': 'solid'},
                    '.border-b-solid': {'border-bottom-style': 'solid'},
                    '.border-l-solid': {'border-left-style': 'solid'},
                    '.border-t-dashed': {'border-top-style': 'dashed'},
                    '.border-r-dashed': {'border-right-style': 'dashed'},
                    '.border-b-dashed': {'border-bottom-style': 'dashed'},
                    '.border-l-dashed': {'border-left-style': 'dashed'},
                    '.border-t-dotted': {'border-top-style': 'dotted'},
                    '.border-r-dotted': {'border-right-style': 'dotted'},
                    '.border-b-dotted': {'border-bottom-style': 'dotted'},
                    '.border-l-dotted': {'border-left-style': 'dotted'},
                },
                ['responsive']
            );
        },
    ],
};
