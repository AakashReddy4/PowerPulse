import {Info} from "lucide-react"
import logo from "../assets/logo.svg"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"

function LandingTopbar() {
  const navigate=useNavigate()

  return (
    <header className="w-full sticky top-0 z-50 bg-charcoal_brown/20 backdrop-blur-md">

      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 h-16">

        {/* Logo + Name */}
        <div
          onClick={() => navigate("/home")}
          className="flex items-center gap-1 cursor-pointer"
        >
          <img
            src={logo}
            alt="PowerPulse"
            className="h-9 w-auto"
          />
          <span className="text-[22px] font-semibold tracking-wide leading-none">
            PowerPulse
          </span>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-6 text-khaki_beige">

          <button onClick={() => navigate("/about")} className="cursor-pointer bg-transparent border-none p-2 rounded-md hover:bg-charcoal_brown/60 hover:text-dry_sage_light transition-colors duration-200">
            <Info size={20} strokeWidth={1.8}/>
          </button>

        </div>

      </div>

    </header>
  )
}

export default LandingTopbar