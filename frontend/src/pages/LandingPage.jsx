// src/pages/LandingPage.jsx
import React, { useState, useEffect } from "react"
import { Cpu, Wrench, Network, Activity, Ticket } from "lucide-react"
import { useNavigate } from "react-router-dom"
import LandingTopbar from "../components/LandingTopbar"

// Colors
const COLORS = {
  khaki: "#b6ad90",
  camel: "#a68a64",
  toffee: "#936639",
  dusty: "#656d4a",
  charcoal: "rgba(51,61,41,0.34)",
  cardBg: "rgba(40,44,34,0.42)",
  text: "#f3f3ee",
  accentLight: "rgba(233,167,114,0.95)",
}


export default function LandingPage() {

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.2 }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const features = [
    {
      key: "asset",
      icon: <Cpu size={30} color={COLORS.camel} />,
      title: "Asset Monitoring",
      desc: "Track substations, transformers and panels across your infrastructure.",
    },
    {
      key: "maint",
      icon: <Wrench size={30} color={COLORS.camel} />,
      title: "Maintenance Planning",
      desc: "Schedule preventive maintenance and keep equipment running smoothly.",
    },
    {
      key: "twin",
      icon: <Network size={30} color={COLORS.camel} />,
      title: "Digital Twin",
      desc: "Interact with a visual model of your electrical network.",
    },
    {
      key: "anomaly",
      icon: <Activity size={30} color={COLORS.camel} />,
      title: "Anomaly Detection",
      desc: "Detect abnormal behaviour and prevent critical failures.",
    },
    {
      key: "ticket",
      icon: <Ticket size={30} color={COLORS.camel} />,
      title: "Smart Ticketing",
      desc: "Report electrical issues, track technician progress and resolve faults efficiently."
    }
  ]

  const navigate = useNavigate()

  return (
    <>
    <LandingTopbar />
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        padding: "48px 24px",
        color: COLORS.text,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto",
        overflowX: "hidden",
        paddingTop: 30 
      }}
    >
      {/* Animated background glows (absolute) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-200px",
          top: "-220px",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: COLORS.toffee,
          opacity: 0.12,
          filter: "blur(160px)",
          transform: "translateZ(0)",
          animation: "floatSlow 12s linear infinite",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "-220px",
          bottom: "-240px",
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: COLORS.dusty,
          opacity: 0.12,
          filter: "blur(160px)",
          transform: "translateZ(0)",
          animation: "floatSlowReverse 14s linear infinite",
        }}
      />

      {/* content container (centered column) */}
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* Top hero row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
          {/* Left: text and CTAs */}
          <div>
            <h1
              style={{
                fontSize: 42,
                lineHeight: 1.02,
                background: "linear-gradient(90deg,#b6ad90,#a68a64,#936639,#a68a64,#b6ad90)",
                backgroundSize: "300% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "titleGlow 6s linear infinite"
              }}
            >
              Electrical Operations <br />
              <span style={{ color: COLORS.camel }}>Simplified</span>
            </h1>

            <p style={{ color: "#cfcfbf", fontSize: 16, marginTop: 18, maxWidth: 540 }}>
              PowerPulse helps organizations monitor assets, manage maintenance, track faults and visualize
              infrastructure through an integrated digital twin platform.
            </p>

            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button
                style={{
                  padding: "12px 26px",
                  borderRadius: 10,
                  background: COLORS.toffee,
                  color: "#fff",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                }}
                onClick={() => navigate("/login")}
              >
                Login
              </button>

              <button
                style={{
                  padding: "12px 26px",
                  borderRadius: 10,
                  background: "transparent",
                  color: COLORS.camel,
                  border: `1px solid rgba(166,138,100,0.2)`,
                  cursor: "pointer",
                }}
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>
          </div>

          {/* Right: visual preview (glass card) */}
          <div
            style={{
              height: 360,
              borderRadius: 18,
              background: "rgba(30,34,26,0.32)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 50px rgba(2,4,2,0.55)",
              border: "1px solid rgba(255,255,255,0.04)",
              position: "relative",
            }}
          >
            {/* Simple animated placeholder network: a few circles with pulse */}
            <svg width="70%" height="70%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">

              <defs>

                {/* grid background */}
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0 L0 0 0 20" fill="none" stroke="#656d4a" strokeWidth="0.6" opacity="0.25"/>
                </pattern>

                {/* node glow */}
                <radialGradient id="g1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={COLORS.camel} stopOpacity="0.95" />
                  <stop offset="60%" stopColor={COLORS.camel} stopOpacity="0.15" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                {/* energy pulse glow */}
                <radialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#e9a772" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#e9a772" stopOpacity="0"/>
                </radialGradient>

              </defs>

              {/* GRID */}
              <rect width="400" height="240" fill="url(#grid)" />

              {/* NETWORK LINES */}
              <line x1="80" y1="60" x2="200" y2="40" stroke="rgba(166,138,100,0.35)" strokeWidth="2"/>
              <line x1="200" y1="40" x2="320" y2="90" stroke="rgba(166,138,100,0.35)" strokeWidth="2"/>
              <line x1="120" y1="160" x2="200" y2="120" stroke="rgba(166,138,100,0.35)" strokeWidth="2"/>
              <line x1="200" y1="120" x2="300" y2="170" stroke="rgba(166,138,100,0.35)" strokeWidth="2"/>

              {/* ENERGY PULSE ANIMATION */}
              <circle r="4" fill="url(#pulseGlow)">
                <animateMotion dur="4s" repeatCount="indefinite">
                  <mpath href="#p1"/>
                </animateMotion>
              </circle>

              <circle r="4" fill="url(#pulseGlow)">
                <animateMotion begin="1.2s" dur="4s" repeatCount="indefinite">
                  <mpath href="#p2"/>
                </animateMotion>
              </circle>

              {/* motion paths */}
              <path id="p1" d="M80 60 L200 40 L320 90" fill="none"/>
              <path id="p2" d="M120 160 L200 120 L300 170" fill="none"/>

              {/* NODE GLOW */}
              <circle cx="80" cy="60" r="18" fill="url(#g1)" opacity="0.35"/>
              <circle cx="200" cy="40" r="16" fill="url(#g1)" opacity="0.35"/>
              <circle cx="320" cy="90" r="18" fill="url(#g1)" opacity="0.35"/>
              <circle cx="120" cy="160" r="16" fill="url(#g1)" opacity="0.35"/>
              <circle cx="200" cy="120" r="16" fill="url(#g1)" opacity="0.35"/>
              <circle cx="300" cy="170" r="16" fill="url(#g1)" opacity="0.35"/>

              {/* NODES */}
              <circle className="pp-node pp-node-1" cx="80" cy="60" r="10" fill={COLORS.camel} />
              <circle className="pp-node pp-node-2" cx="200" cy="40" r="8" fill={COLORS.accentLight} />
              <circle className="pp-node pp-node-3" cx="320" cy="90" r="10" fill={COLORS.camel} />
              <circle className="pp-node pp-node-4" cx="120" cy="160" r="9" fill={COLORS.accentLight} />
              <circle className="pp-node pp-node-5" cx="200" cy="120" r="8" fill={COLORS.camel} />
              <circle className="pp-node pp-node-6" cx="300" cy="170" r="9" fill={COLORS.accentLight} />

            </svg>
          </div>
        </div>

                <div
          style={{
            marginTop: 50,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 20,
            textAlign: "center"
          }}
        >

          <Capability title="Real-time Monitoring" />
          <Capability title="Predictive Insights" />
          <Capability title="Asset Tracking" />
          <Capability title="Maintenance Automation" />

        </div>

        {/* FEATURES grid — forced 2x2 layout so it's always side-by-side on desktop */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 22,
          marginTop: 40,
          alignItems: "stretch"
        }}>
          {features.map((f, i) => (
            <div
              key={f.key}
              style={
                i === 4
                  ? {
                      gridColumn: "1 / span 2",
                      display: "flex",
                      justifyContent: "center",
                      transitionDelay: `${i * 0.1}s` 
                    }
                  : {}
              }
              className="reveal"
            >
              <div style={{ width: i === 4 ? "50%" : "100%" }}>
                <FeatureCard
                  icon={f.icon}
                  title={f.title}
                  description={f.desc}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* small styles & keyframes */}
      <style>{`
        @keyframes floatSlow {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(8px) translateX(6px); }
          100% { transform: translateY(0) translateX(0); }
        }
        @keyframes floatSlowReverse {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX:-6px; }
          100% { transform: translateY(0) translateX(0); }
        }

        /* simple pulse for nodes */
        .pp-node { filter: drop-shadow(0 6px 18px rgba(0,0,0,0.45)); transform-origin: center; transition: transform 220ms ease; }
        .pp-node-1 { animation: pulse 2.8s infinite ease-in-out 0s; }
        .pp-node-2 { animation: pulse 3.4s infinite ease-in-out 0.3s; }
        .pp-node-3 { animation: pulse 2.6s infinite ease-in-out 0.7s; }
        .pp-node-4 { animation: pulse 3.1s infinite ease-in-out 0.2s; }
        .pp-node-5 { animation: pulse 2.9s infinite ease-in-out 0.9s; }
        .pp-node-6 { animation: pulse 3.6s infinite ease-in-out 0.4s; }

        @keyframes pulse {
          0% { transform: scale(1); opacity:1; }
          50% { transform: scale(1.28); opacity:0.85; }
          100% { transform: scale(1); opacity:1; }
        }
      `}</style>

      <style>
        {`
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.7s ease;
        }

        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes titleGlow {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 300% 50%;
          }
        }
        `}
      </style>
    </div>
    </>
  )
}

/* FeatureCard uses internal hover state to guarantee visible transform & shadow (works regardless of Tailwind) */
function FeatureCard({ icon, title, description }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 16,
        padding: 24,
        background: "rgba(30,34,26,0.38)",
        backdropFilter: "blur(6px)",
        color: "#f3f3ee",
        cursor: "pointer",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
        transform: hover ? "translateY(-4px) scale(1.012)" : "translateY(0)",
        boxShadow: hover
          ? "0 20px 45px rgba(2,4,2,0.55)"
          : "0 10px 28px rgba(2,4,2,0.35)",
        position: "relative",
        overflow: "hidden"
      }}
    >

      {/* light sweep */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: hover ? "120%" : "-120%",
          width: "120%",
          height: "100%",
          background:
            "linear-gradient(120deg, transparent, rgba(255,255,255,0.06), transparent)",
          transition: "left 0.8s ease"
        }}
      />

      {/* icon */}
      <div
        style={{
          marginBottom: 14,
          color: "#a68a64",
          filter: hover ? "drop-shadow(0 0 6px rgba(233,167,114,0.6))" : "none",
          transition: "filter 0.3s ease"
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700
        }}
      >
        {title}
      </h3>

      <p
        style={{
          marginTop: 10,
          color: "#cfcfbf",
          lineHeight: 1.45
        }}
      >
        {description}
      </p>

    </div>
  )
}

function Capability({ title }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: "rgba(30,34,26,0.35)",
        backdropFilter: "blur(6px)",
        color: "#cfcfbf",
        fontSize: 14,
        letterSpacing: 0.4,
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)"
      }}
    >
      {title}
    </div>
  )
}