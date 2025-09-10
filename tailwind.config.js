module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Custom breakpoints for better iPad and laptop support
        'tablet': '768px',
        'laptop': '1024px',
        'desktop': '1280px',
      },
      colors: {
        chocolate: '#ECBF98',
        purple: '#E1B7BB'
      },
      animation: {
        'slide-down': 'slideDown 0.4s ease-out',
        'fade-out': 'fadeOut 1s ease-in forwards',
        'fade-in': 'fadeIn 0.3s ease-out'
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        fadeIn: { 
          '0%': { opacity: '0', transform: 'translateY(-5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
};



