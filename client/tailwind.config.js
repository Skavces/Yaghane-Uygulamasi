/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideDown: {
          '0%': { transform: 'translate(-50%, -100%)', opacity: '0' },
          '100%': { transform: 'translate(-50%, 0)', opacity: '1' }
        },
        spinToCircle: {
          '0%': { 
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            transform: 'rotate(0deg)' 
          },
          '70%': { 
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            transform: 'rotate(1080deg)' 
          },
          '100%': { 
            borderColor: 'white',
            transform: 'rotate(1080deg)' 
          }
        },
        checkmark: {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out',
        spinToCircle: 'spinToCircle 1.5s ease-out forwards',
        checkmark: 'checkmark 0.5s ease-out 1.5s forwards'
      }
    },
  },
  plugins: [],
}