import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

function GlassSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)

  const selected = options.find(o => o.value === value)

  return (
    <div className="gs-wrapper">
      <div
        className="gs-trigger"
        onClick={() => setOpen(prev => !prev)}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={`gs-icon ${open ? "rotate" : ""}`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="gs-dropdown"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {options.map(opt => (
              <div
                key={opt.value}
                className={`gs-option ${
                  value === opt.value ? "active" : ""
                }`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* WRAPPER */
        .gs-wrapper {
        position: relative;
        width: 100%;
        }

        /* BUTTON */
        .gs-trigger {
        display: flex;
        justify-content: space-between;
        align-items: center;

        padding: 14px 16px;
        border-radius: 14px;

        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.14);

        cursor: pointer;
        transition: all 0.25s ease;
        }

        .gs-trigger:hover {
        border-color: rgba(166, 138, 100, 0.5);
        background: rgba(0, 0, 0, 0.32);
        }

        .gs-icon {
        opacity: 0.7;
        transition: transform 0.3s ease;
        }

        .gs-icon.rotate {
        transform: rotate(180deg);
        }

        /* DROPDOWN PANEL */
        .gs-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;

        border-radius: 16px;

        background: rgba(20, 20, 20, 0.6);
        backdrop-filter: blur(18px);

        border: 1px solid rgba(255, 255, 255, 0.12);

        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

        overflow: hidden;
        z-index: 50;
        }

        /* OPTIONS */
        .gs-option {
        padding: 12px 16px;
        font-size: 14px;

        cursor: pointer;
        transition: all 0.2s ease;
        }

        .gs-option:hover {
        background: rgba(166, 138, 100, 0.18);
        }

        .gs-option.active {
        background: rgba(166, 138, 100, 0.28);
        }
      `}</style>
    </div>
  )
}



export default GlassSelect