import { motion } from "framer-motion"

function GlassPanel({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className={`
        backdrop-blur-xl
        bg-white/10
        border border-white/20
        shadow-xl
        rounded-[20px]
        p-6
        transition-all
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

export default GlassPanel