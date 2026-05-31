import { motion } from "framer-motion"
import LandingTopbar from "../components/LandingTopbar"
import { Github, Mail, Linkedin } from "lucide-react"

const cardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "18px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
  transition: "all 0.3s ease",
}

function About() {
  return (
    <div className="min-h-screen">
      <LandingTopbar />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "60px 24px" }}>

        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px" }}>

          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 style={{ fontSize: "34px", fontWeight: "600", marginBottom: "16px" }}>
              About Me
            </h1>

            <h2 style={{ fontSize: "22px", marginBottom: "12px" }}>
              Aakash Reddy
            </h2>

            <p style={{ opacity: 0.85, lineHeight: "1.7" }}>
              Building impactful, scalable systems focused on solving real-world problems.
              Currently developing a centralized electrical operations platform integrating
              tracking, analytics, and intelligent workflows.
            </p>

            <p style={{ marginTop: "12px", opacity: 0.75 }}>
              Passionate about full-stack development and crafting production-level applications.
            </p>

            
            <div style={{ marginTop: "22px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {["React", "Node.js", "MongoDB", "System Design"].map(skill => (
                <span
                  key={skill}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    fontSize: "12px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>

          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "40px" }}
          >

            
            <div
              style={cardStyle}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.04) translateY(-4px)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1) translateY(0)"
              }}
            >
              <Mail size={18} />
              <span>bgakashreddy@gmail.com</span>
            </div>

            <div
              style={cardStyle}
              onClick={() => window.open("https://github.com/AakashReddy4", "_blank")}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.04) translateY(-4px)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1) translateY(0)"
              }}
              className="cursor-pointer"
            >
              <Github size={18} />
              <span>GitHub — AakashReddy4</span>
            </div>

            
            <div
              style={cardStyle}
              onClick={() =>
                window.open("https://www.linkedin.com/in/aakashreddy04/", "_blank")
              }
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.04) translateY(-4px)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1) translateY(0)"
              }}
              className="cursor-pointer"
            >
              <Linkedin size={18} />
              <span>LinkedIn Profile</span>
            </div>

          </motion.div>
        </div>

        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: "60px",
            padding: "24px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
          }}
        >
          <h2 style={{ fontSize: "20px", marginBottom: "10px" }}>
            About This Platform
          </h2>

          <p style={{ opacity: 0.85, lineHeight: "1.7" }}>
            This platform is designed to manage electrical operations at scale —
            from usage tracking to maintenance workflows and intelligent insights.
            Built with a focus on real-world usability and system-level thinking.
          </p>
        </motion.div>

      </div>
    </div>
  )
}

export default About