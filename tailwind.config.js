/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/renderer/**/*.{html,tsx,ts,jsx,js}'],
    theme: {
        extend: {
            colors: {
                base: 'var(--bg-base)',
                surface: 'var(--bg-surface)',
                'surface-light': 'var(--bg-surface-light)',
                glass: 'var(--glass-bg)',
                accent: 'var(--accent)',
                'accent-muted': 'var(--accent-muted)',
                'accent-glow': 'var(--accent-glow)',
                muted: '#6B7280',
                danger: '#EF4444',
                success: '#10B981',
                warning: '#F59E0B',
                text: 'var(--text-primary)',
                'text-dim': 'var(--text-secondary)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backdropBlur: {
                glass: '16px',
            },
            boxShadow: {
                glow: '0 0 20px var(--accent-glow, rgba(0,240,255,0.35))',
                'glow-sm': '0 0 10px var(--accent-glow, rgba(0,240,255,0.2))',
                card: '0 4px 24px rgba(0,0,0,0.4)',
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.3s ease-out',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 10px var(--accent-glow, rgba(0,240,255,0.2))' },
                    '50%': { boxShadow: '0 0 25px var(--accent-glow, rgba(0,240,255,0.5))' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
