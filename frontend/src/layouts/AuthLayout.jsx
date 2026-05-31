function AuthLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1f2518",
        position: "relative",
        overflow: "hidden"
      }}
    >

      {/* background glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          background: "#936639",
          filter: "blur(140px)",
          opacity: 0.2,
          top: "-100px",
          left: "-100px"
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          background: "#656d4a",
          filter: "blur(140px)",
          opacity: 0.2,
          bottom: "-100px",
          right: "-100px"
        }}
      />

      {/* form container */}
      <div
        style={{
          width: 360,
          padding: "50px 50px",
          borderRadius: 16,
          background: "rgba(30,34,26,0.4)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.05)",
          zIndex: 2
        }}
      >
        {children}
      </div>

    </div>
  )
}

export default AuthLayout