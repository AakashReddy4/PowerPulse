/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
  extend: {
    colors: {
      dark_walnut: "#582f0e",
      saddle_brown: "#7f4f24",
      toffee_brown: "#936639",
      camel: "#a68a64",
      khaki_beige: "#b6ad90",
      dry_sage: "#c2c5aa",
      dry_sage_light: "#a4ac86",
      dusty_olive: "#656d4a",
      ebony: "#414833",
      charcoal_brown: "#333d29"
    }
  },
},
  plugins: [],
}