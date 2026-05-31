import AppTopbar from "../components/AppTopbar"

function MainLayout({ children }) {
  return (
    <div className="min-h-screen">

      <AppTopbar />

      <main className="px-6 py-6">
        {children}
      </main>

    </div>
  )
}

export default MainLayout