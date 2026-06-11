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
                // Stitch Custom Colors
                "surface-container-lowest": "#0e0e10",
                "error": "#ffb4ab",
                "error-container": "#93000a",
                "on-secondary-container": "#d6a9ff",
                "surface-container-low": "#1c1b1d",
                "on-secondary-fixed": "#2c0051",
                "on-secondary": "#490080",
                "on-surface-variant": "#c7c4d7",
                "on-secondary-fixed-variant": "#6900b3",
                "on-tertiary": "#4f2500",
                "secondary-fixed-dim": "#ddb7ff",
                "primary-fixed-dim": "#c0c1ff",
                "on-error": "#690005",
                "inverse-surface": "#e5e1e4",
                "primary-container": "#8083ff",
                "on-primary-container": "#0d0096",
                "on-primary": "#1000a9",
                "on-error-container": "#ffdad6",
                "on-primary-fixed-variant": "#2f2ebe",
                "surface-variant": "#353437",
                "surface-container-highest": "#353437",
                "outline-variant": "#464554",
                "tertiary-fixed": "#ffdcc5",
                "tertiary": "#ffb783",
                "on-primary-fixed": "#07006c",
                "surface-tint": "#c0c1ff",
                "tertiary-fixed-dim": "#ffb783",
                "inverse-on-surface": "#313032",
                "inverse-primary": "#494bd6",
                "surface": "#131315",
                "surface-container-high": "#2a2a2c",
                "on-tertiary-fixed": "#301400",
                "surface-bright": "#39393b",
                "on-surface": "#e5e1e4",
                "secondary-container": "#6f00be",
                "on-tertiary-container": "#452000",
                "on-tertiary-fixed-variant": "#703700",
                "tertiary-container": "#d97721",
                "surface-container": "#201f22",
                "on-background": "#e5e1e4",
                "outline": "#908fa0",
                "surface-dim": "#131315",
                "primary-fixed": "#e1e0ff",
                "secondary-fixed": "#f0dbff"
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                // Stitch Custom
                "DEFAULT": "0.25rem",
                "xl": "0.75rem",
                "full": "9999px"
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
                "2xl": "3rem"
            },
            fontFamily: {
                "headline-lg-mobile": ["Geist", "sans-serif"],
                "label-md": ["JetBrains Mono", "monospace"],
                "headline-lg": ["Geist", "sans-serif"],
                "body-sm": ["Geist", "sans-serif"],
                "headline-md": ["Geist", "sans-serif"],
                "label-sm": ["JetBrains Mono", "monospace"],
                "body-lg": ["Geist", "sans-serif"],
                "body-md": ["Geist", "sans-serif"],
                "display": ["Geist", "sans-serif"]
            },
            fontSize: {
                "headline-lg-mobile": ["24px", { "lineHeight": "1.2", "fontWeight": "600" }],
                "label-md": ["14px", { "lineHeight": "1.2", "fontWeight": "500" }],
                "headline-lg": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "600" }],
                "body-sm": ["14px", { "lineHeight": "1.5", "fontWeight": "400" }],
                "headline-md": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
                "label-sm": ["12px", { "lineHeight": "1.2", "fontWeight": "500" }],
                "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "display": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.05em", "fontWeight": "700" }]
            },
            backgroundImage: {
                'gradient-primary': 'var(--gradient-primary)',
                'gradient-card': 'var(--gradient-card)',
                'gradient-background': 'var(--gradient-background)'
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
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-in': 'slide-in 0.5s ease-out'
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
