function IconButton({ children }) {
  return (
    <button
      className="
        flex items-center justify-center
        text-khaki_beige
        hover:text-dry_sage_light
        transition-colors duration-200
      "
    >
      {children}
    </button>
  )
}

export default IconButton