import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import {
  Activity,
  AlertTriangle,
  Boxes,
  ChevronRight,
  Cpu,
  Gauge,
  MapPin,
  PackagePlus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  Zap,
  Network,
} from "lucide-react"

import AppTopbar from "../components/AppTopbar"

import { API_BASE } from "../config"

const categoryOptions = [
  "Transformer",
  "Generator",
  "Electrical Panel",
  "Motor",
  "Pump",
  "Street Light",
  "Battery Bank",
  "Solar Inverter",
  "UPS",
  "Substation",
  "Other",
]

const statusOptions = [
  "Operational",
  "Under Maintenance",
  "Fault Detected",
  "Critical",
  "Inactive",
]

const categoryPrefixMap = {
  Transformer: "TR",
  Generator: "GEN",
  "Electrical Panel": "EP",
  Motor: "MTR",
  Pump: "PMP",
  "Street Light": "SL",
  "Battery Bank": "BAT",
  "Solar Inverter": "INV",
  UPS: "UPS",
  Substation: "SUB",
  Other: "AST",
}

const backendTypeMap = {
  Transformer: "transformer",
  Generator: "generator",
  "Electrical Panel": "panel_board",
  Motor: "other",
  Pump: "other",
  "Street Light": "other",
  "Battery Bank": "other",
  "Solar Inverter": "solar_inverter",
  UPS: "other",
  Substation: "substation",
  Other: "other",
}

function Assets() {

  const [assets, setAssets] = useState([])
  const [tickets, setTickets] = useState([])

  const [selectedAsset, setSelectedAsset] =
    useState(null)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("ALL")

  const [showCreate, setShowCreate] =
    useState(false)

  const [loading, setLoading] = useState(true)

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    text: "",
  })

const [form, setForm] = useState({
  name: "",
  category: "Transformer",
  location: "",
  manufacturer: "",
  installationDate: "",
  status: "Operational",
  capacity: "",
  maintenanceIntervalDays: 30,
})

  useEffect(() => {
    loadData()
  }, [])

  const fetchWithAuth = async (
    url,
    options = {}
  ) => {

    const token = localStorage.getItem("token")

    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
  }

  const openPopup = (title, text) => {
    setPopup({
      open: true,
      title,
      text,
    })
  }

  const closePopup = () => {
    setPopup({
      open: false,
      title: "",
      text: "",
    })
  }

  const loadData = async () => {

    try {

      setLoading(true)

      const [assetRes, ticketRes] =
        await Promise.all([
          fetchWithAuth(`${API_BASE}/api/assets`),
          fetchWithAuth(
            `${API_BASE}/api/tickets/organization`
          ),
        ])

      const assetData = await assetRes.json()
      const ticketData = await ticketRes.json()

      const assetArray = Array.isArray(assetData)
        ? assetData
        : assetData?.data || []

      const ticketArray = Array.isArray(
        ticketData?.data
      )
        ? ticketData.data
        : []

      setAssets(assetArray)
      setTickets(ticketArray)

      if (assetArray.length > 0) {
        setSelectedAsset(assetArray[0])
      }

    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)

    }
  }

  const createAsset = async () => {

    try {

      const generatedId = `${
        categoryPrefixMap[form.category] || "AST"
      }-${Math.floor(100 + Math.random() * 900)}`

const payload = {

  name: form.name,

  assetId: generatedId,

  category: form.category,

  location: form.location,

  installationDate:
    form.installationDate || null,

  maintenanceIntervalDays:
    Number(
      form.maintenanceIntervalDays
    ) || 30,

  manufacturer: form.manufacturer,

  capacity: form.capacity,

  status: form.status,
}

      const res = await fetchWithAuth(
        `${API_BASE}/api/assets`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message || "Creation failed"
        )
      }

      setShowCreate(false)

      setForm({
        name: "",
        category: "Transformer",
        location: "",
        manufacturer: "",
        installationDate: "",
        status: "Operational",
        capacity: "",
        maintenanceIntervalDays: 30,
      })

      loadData()

    } catch (err) {

      console.error(err)

      alert(err.message)

    }
  }

  const deleteAsset = async (id) => {

    try {

      const confirmDelete =
        window.confirm(
          "Delete asset permanently?"
        )

      if (!confirmDelete) return

      const res = await fetchWithAuth(
        `${API_BASE}/api/assets/${id}`,
        {
          method: "DELETE",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message || "Delete failed"
        )
      }

      const updated = assets.filter(
        (asset) => asset._id !== id
      )

      setAssets(updated)

      if (selectedAsset?._id === id) {
        setSelectedAsset(updated[0] || null)
      }

    } catch (err) {

      console.error(err)

      alert(err.message)

    }
  }

  const filteredAssets = useMemo(() => {

    return assets.filter((asset) => {

      const category =
        asset.category ||
        asset.type ||
        "Other"

      const searchMatch =
        asset.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        asset.assetId
          ?.toLowerCase()
          .includes(search.toLowerCase())

      const categoryMatch =
        filter === "ALL"
          ? true
          : category
              .toLowerCase()
              .includes(
                filter.toLowerCase()
              )

      return searchMatch && categoryMatch
    })

  }, [assets, search, filter])

  const linkedTickets = useMemo(() => {

    if (!selectedAsset) return []

    return tickets.filter((ticket) => {

      const linked =
        typeof ticket.asset === "object"
          ? ticket.asset?._id
          : ticket.asset

      return linked === selectedAsset._id
    })

  }, [tickets, selectedAsset])

  if (loading) {
    return (
      <div className="as-loading">
        <div className="as-loader" />
        <h2>
          Synchronizing Infrastructure Grid...
        </h2>
      </div>
    )
  }

  return (

    <div className="as-page">

      <AppTopbar />

      <main className="as-shell">

        {/* HERO */}

        <section className="as-hero">

          <div className="as-hero-left">

            <div className="as-badge">
              <Boxes size={13} />
              Infrastructure Registry
            </div>

            <h1>
              Infrastructure
              <br />
              Assets
            </h1>

            <p>
              Operational infrastructure
              intelligence integrating
              assets, linked fault events,
              maintenance readiness,
              technician workflows, and
              digital twin orchestration.
            </p>

          </div>

          <div className="as-hero-right">

            <div className="topology-core">

              <div className="center-node">
                <Power size={22} />
              </div>

              <motion.div
                className="orbit orbit1"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 18,
                  ease: "linear",
                }}
              >
                <div className="node blue" />
              </motion.div>

              <motion.div
                className="orbit orbit2"
                animate={{ rotate: -360 }}
                transition={{
                  repeat: Infinity,
                  duration: 22,
                  ease: "linear",
                }}
              >
                <div className="node green" />
              </motion.div>

              <motion.div
                className="orbit orbit3"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 28,
                  ease: "linear",
                }}
              >
                <div className="node purple" />
              </motion.div>

            </div>

            <div className="topology-stats">

              <div>
                <span>Assets</span>
                <strong>{assets.length}</strong>
              </div>

              <div>
                <span>Events</span>
                <strong>{tickets.length}</strong>
              </div>

              <div>
                <span>Twin</span>
                <strong>Ready</strong>
              </div>

            </div>

          </div>

        </section>

        {/* MAIN */}

        <section className="as-main">

          {/* LEFT */}

          <aside className="as-left">

            <div className="left-controls">

              <div className="search-box">

                <Search size={14} />

                <input
                  type="text"
                  placeholder="Search infrastructure..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

              </div>

              <div className="filter-row">

                {[
                  "ALL",
                  "Transformer",
                  "Generator",
                  "Motor",
                ].map((item) => (

                  <button
                    key={item}
                    className={
                      filter === item
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setFilter(item)
                    }
                  >
                    {item}
                  </button>

                ))}

              </div>

              <button
                className="register-btn"
                onClick={() =>
                  setShowCreate(true)
                }
              >
                <PackagePlus size={16} />
                Register Asset
              </button>

            </div>

            <div className="asset-list">

              {filteredAssets.length === 0 ? (
                <div className="empty-state">
                  <h3>No assets registered</h3>
                  <p>
                    Register transformers, generators,
                    meters, and infrastructure assets.
                  </p>
                </div>
              ) : (
                filteredAssets.map((asset) => (

                <motion.div
                  key={asset._id}
                  whileHover={{ y: -2 }}
                  className={`asset-card ${
                    selectedAsset?._id ===
                    asset._id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedAsset(asset)
                  }
                >

                  <div className="asset-top">

                    <div className="asset-icon">
                      <Zap size={18} />
                    </div>

                    <div>

                      <h3>{asset.name}</h3>

                      <span>
                        {asset.category}
                      </span>

                    </div>

                  </div>

                  <div className="asset-bottom">

                    <div className="asset-location">
                      <MapPin size={10} />
                      {asset.location ||
                        "Unknown"}
                    </div>

                    <ChevronRight size={15} />

                  </div>

                </motion.div>

              ))
              )}

            </div>

          </aside>

          {/* RIGHT */}

          <section className="as-right">

            {selectedAsset && (

              <motion.div
                key={selectedAsset._id}
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="detail-layer"
              >

                {/* HEADER */}

                <div className="detail-header">

                  <div className="detail-left">

                    <div className="detail-icon">
                      <Network size={28} />
                    </div>

                    <div>

                      <div className="asset-id">
                        {
                          selectedAsset.assetId
                        }
                      </div>

                      <h2>
                        {selectedAsset.name}
                      </h2>

                    </div>

                  </div>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      deleteAsset(
                        selectedAsset._id
                      )
                    }
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>

                </div>

                {/* GRID */}

                <div className="meta-grid">

                  <div>
                    <span>Type</span>
                    <strong>
                      {
  selectedAsset.category
    ?.replace(/_/g, " ")
    ?.replace(/\b\w/g, (c) =>
      c.toUpperCase()
    )
}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {selectedAsset.status ||
                        "Operational"}
                    </strong>
                  </div>

                  <div>
                    <span>Location</span>
                    <strong>
                      {selectedAsset.location ||
                        "Unavailable"}
                    </strong>
                  </div>

                  <div>
                    <span>Capacity</span>
                    <strong>
                      {selectedAsset.capacity ||
                        "Unavailable"}
                    </strong>
                  </div>

                </div>

                {/* MODULES */}

                <div className="ops-grid">

                  <button
                    className="op-module blue"
                    onClick={() =>
                      openPopup(
                        "Maintenance Integration",
                        "This asset is prepared for preventive maintenance scheduling, technician workflows, and maintenance lifecycle orchestration."
                      )
                    }
                  >

                    <Wrench size={18} />

                    <div>

                      <strong>
                        Maintenance
                        Layer
                      </strong>

                      <p>
                        Preventive
                        maintenance
                        orchestration.
                      </p>

                    </div>

                  </button>

                  <button
                    className="op-module purple"
                    onClick={() =>
                      openPopup(
                        "Digital Twin Ready",
                        "Twin-ready infrastructure entity with operational coordinates and hierarchy synchronization."
                      )
                    }
                  >

                    <Cpu size={18} />

                    <div>

                      <strong>
                        Twin Sync
                      </strong>

                      <p>
                        Spatial network
                        infrastructure.
                      </p>

                    </div>

                  </button>

                  <button
                    className="op-module green"
                    onClick={() =>
                      openPopup(
                        "Operational Intelligence",
                        "Linked fault analytics, event tracking, and future predictive intelligence support enabled."
                      )
                    }
                  >

                    <Activity size={18} />

                    <div>

                      <strong>
                        Intelligence
                      </strong>

                      <p>
                        Operational
                        analytics layer.
                      </p>

                    </div>

                  </button>

                </div>

                {/* EVENTS */}

                <div className="events-layer">

                  <div className="events-head">

                    <div>

                      <h3>
                        Linked Operational
                        Events
                      </h3>

                      <p>
                        Tickets and
                        infrastructure
                        incidents related
                        to this asset.
                      </p>

                    </div>

                    <Gauge size={18} />

                  </div>

                  <div className="events-list">

                    {linkedTickets.length ===
                    0 ? (

                      <div className="empty-events">

                        <motion.div
                          animate={{
                            opacity: [
                              .4,
                              1,
                              .4,
                            ],
                          }}
                          transition={{
                            repeat:
                              Infinity,
                            duration: 2,
                          }}
                        >
                          <AlertTriangle size={26} />
                        </motion.div>

                        <strong>
                          Awaiting linked
                          operational
                          incidents
                        </strong>

                        <p>
                          Events will
                          automatically
                          synchronize when
                          tickets are linked
                          to this
                          infrastructure
                          asset.
                        </p>

                      </div>

                    ) : (

                      linkedTickets.map(
                        (ticket) => (

                          <div
                            key={
                              ticket._id
                            }
                            className="event-card"
                          >

                            <div className="event-dot" />

                            <div className="event-body">

                              <div className="event-top">

                                <strong>
                                  {
                                    ticket.title
                                  }
                                </strong>

                                <span>
                                  {
                                    ticket.status
                                  }
                                </span>

                              </div>

                              <p>
                                {
                                  ticket.category
                                }
                              </p>

                            </div>

                          </div>
                        )
                      )
                    )}

                  </div>

                </div>

              </motion.div>
            )}

          </section>

        </section>

      </main>

      {/* CREATE */}

      <AnimatePresence>

        {showCreate && (

          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            <motion.div
              className="modal"
              initial={{
                opacity: 0,
                scale: .9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: .9,
              }}
            >

              <div className="modal-head">

                <div>

                  <h2>
                    Register Asset
                  </h2>

                  <p>
                    Integrate
                    infrastructure into
                    operational grid.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setShowCreate(false)
                  }
                >
                  ×
                </button>

              </div>

              <div className="form-grid">

                <input
                  type="text"
                  placeholder="Asset Name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name:
                        e.target.value,
                    })
                  }
                />

                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category:
                        e.target.value,
                    })
                  }
                >
                  {categoryOptions.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

                <input
                  type="text"
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location:
                        e.target.value,
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Capacity"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacity:
                        e.target.value,
                    })
                  }
                />

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target.value,
                    })
                  }
                >
                  {statusOptions.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

                <input
                  type="number"
                  placeholder="Maintenance Interval"
                  value={
                    form.maintenanceIntervalDays
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maintenanceIntervalDays:
                        e.target.value,
                    })
                  }
                />

              </div>

              <button
                className="submit-btn"
                onClick={createAsset}
              >
                <PackagePlus size={16} />
                Register Asset
              </button>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* POPUP */}

      <AnimatePresence>

        {popup.open && (

          <motion.div
            className="popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            <motion.div
              className="popup"
              initial={{
                opacity: 0,
                scale: .9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: .9,
              }}
            >

              <h3>{popup.title}</h3>

              <p>{popup.text}</p>

              <button onClick={closePopup}>
                Close
              </button>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      <style>{`

        .as-page{
          min-height:100vh;
        }

        .as-shell{
          max-width:1800px;
          margin:0 auto;
          padding:22px;
        }

.as-hero{
  display:grid;
  grid-template-columns:minmax(0,1fr) 360px;
  gap:20px;
  margin-bottom:18px;
  align-items:center;
}

        .as-badge{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 16px;
          border-radius:999px;
          background:rgba(59,130,246,.12);
          border:1px solid rgba(59,130,246,.22);
          font-size:11px;
        }

.as-hero-left h1{
  font-size:clamp(54px,5vw,72px);
  line-height:.92;
  margin:14px 0 0;
  letter-spacing:-3px;
}

        .as-hero-left p{
          margin-top:18px;
          max-width:760px;
          line-height:1.8;
          opacity:.72;
        }

        .as-hero-right{
          padding:18px;
          border-radius:32px;
        }

        .topology-core{
          position:relative;
          width:190px;
          height:190px;
          margin:0 auto;
        }

        .center-node{
          position:absolute;
          inset:0;
          margin:auto;
          width:74px;
          height:74px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(59,130,246,.16);
          border:1px solid rgba(59,130,246,.3);
          z-index:10;
        }

        .orbit{
          position:absolute;
          inset:0;
          margin:auto;
          border-radius:50%;
          border:1px dashed rgba(255,255,255,.08);
        }

        .orbit1{
          width:120px;
          height:120px;
        }

        .orbit2{
          width:180px;
          height:180px;
        }

        .orbit3{
          width:240px;
          height:240px;
        }

        .node{
          position:absolute;
          top:-7px;
          left:50%;
          transform:translateX(-50%);
          width:14px;
          height:14px;
          border-radius:50%;
        }

        .node.blue{
          background:#3b82f6;
        }

        .node.green{
          background:#22c55e;
        }

        .node.purple{
          background:#a855f7;
        }

        .topology-stats{
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
          gap:12px;
          margin-top:55px;
          margin-right:20px;
        }

        .topology-stats div{
          padding:16px;
          border-radius:18px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          text-align:center;
        }

        .topology-stats span{
          display:block;
          font-size:11px;
          opacity:.6;
        }

        .topology-stats strong{
          display:block;
          margin-top:8px;
          font-size:22px;
        }

.as-main{
  display:grid;
  grid-template-columns:minmax(360px,40%) minmax(0,60%);
  gap:20px;
  height:calc(100vh - 420px);
  min-height:780px;
  align-items:start;
}

        .as-left,
        .as-right{
          min-height:0;
        }

        .left-controls{
          padding:18px;
          border-radius:28px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          margin-bottom:18px;
        }

        .search-box{
          height:56px;
          display:flex;
          align-items:center;
          gap:10px;
          padding:0 16px;
          border-radius:16px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
        }

        .search-box input{
          flex:1;
          background:none;
          border:none;
          outline:none;
          color:white;
        }

        .filter-row{
          display:flex;
          gap:10px;
          margin-top:14px;
        }

        .filter-row button{
          flex:1;
          height:40px;
          border:none;
          border-radius:12px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          color:white;
          cursor:pointer;
        }

        .filter-row button.active{
          background:rgba(59,130,246,.18);
        }

        .register-btn{
          width:100%;
          height:58px;
          margin-top:16px;
          border:none;
          border-radius:16px;
          background:linear-gradient(
            135deg,
            #2563eb,
            #14b8a6
          );
          color:white;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          cursor:pointer;
          font-weight:600;
        }

.asset-list{
  display:flex;
  flex-direction:column;
  gap:14px;
  margin-top:18px;
}

        .asset-list::-webkit-scrollbar,
        .detail-layer::-webkit-scrollbar{
          width:6px;
        }

        .asset-list::-webkit-scrollbar-thumb,
        .detail-layer::-webkit-scrollbar-thumb{
          background:rgba(255,255,255,.12);
          border-radius:999px;
        }

        .asset-card{
          padding:20px;
          border-radius:24px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          cursor:pointer;
          transition:.25s;
        }

        .asset-card.selected{
          background:rgba(59,130,246,.08);
          border-color:rgba(59,130,246,.28);
        }

        .asset-top{
          display:flex;
          gap:14px;
        }

        .asset-icon{
          width:56px;
          height:56px;
          border-radius:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(59,130,246,.12);
          border:1px solid rgba(59,130,246,.2);
        }

        .asset-top h3{
          margin:0;
          font-size:26px;
        }

        .asset-top span{
          font-size:12px;
          opacity:.65;
        }

        .asset-bottom{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-top:16px;
        }

        .asset-location{
          display:flex;
          align-items:center;
          gap:7px;
          padding:8px 12px;
          border-radius:12px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          font-size:11px;
        }

.detail-layer{
  padding:28px;
  border-radius:34px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
}

        .asset-card{
  flex-shrink:0;
}

        .detail-header{
          display:flex;
          justify-content:space-between;
          gap:20px;
        }

        .detail-left{
          display:flex;
          gap:18px;
        }

        .detail-icon{
          width:84px;
          height:84px;
          border-radius:24px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(59,130,246,.12);
          border:1px solid rgba(59,130,246,.22);
        }

        .asset-id{
          display:inline-flex;
          padding:8px 14px;
          border-radius:999px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          font-size:11px;
        }

        .detail-left h2{
          margin:14px 0 0;
          font-size:56px;
        }

        .delete-btn{
          height:54px;
          padding:0 18px;
          border:none;
          border-radius:16px;
          background:rgba(239,68,68,.12);
          border:1px solid rgba(239,68,68,.2);
          color:white;
          display:flex;
          align-items:center;
          gap:10px;
          cursor:pointer;
        }

        .meta-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
          margin-top:24px;
        }

        .meta-grid div{
          padding:20px;
          border-radius:20px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
        }

        .meta-grid span{
          display:block;
          font-size:11px;
          opacity:.6;
        }

        .meta-grid strong{
          display:block;
          margin-top:10px;
          font-size:18px;
        }

        .ops-grid{
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
          gap:16px;
          margin-top:22px;
        }

        .op-module{
          min-height:150px;
          padding:20px;
          border:none;
          border-radius:24px;
          color:white;
          text-align:left;
          cursor:pointer;
          transition:.25s;
        }

        .op-module:hover{
          transform:translateY(-2px);
        }

        .op-module.blue{
          background:linear-gradient(
            135deg,
            rgba(37,99,235,.22),
            rgba(37,99,235,.08)
          );
          border:1px solid rgba(37,99,235,.22);
        }

        .op-module.purple{
          background:linear-gradient(
            135deg,
            rgba(168,85,247,.22),
            rgba(168,85,247,.08)
          );
          border:1px solid rgba(168,85,247,.22);
        }

        .op-module.green{
          background:linear-gradient(
            135deg,
            rgba(34,197,94,.22),
            rgba(34,197,94,.08)
          );
          border:1px solid rgba(34,197,94,.22);
        }

        .op-module strong{
          display:block;
          margin-top:18px;
          font-size:17px;
        }

        .op-module p{
          margin-top:10px;
          line-height:1.7;
          opacity:.72;
          font-size:13px;
        }

        .events-layer{
          margin-top:24px;
          padding:24px;
          border-radius:28px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
        }

        .events-head{
          display:flex;
          justify-content:space-between;
        }

        .events-head h3{
          margin:0;
          font-size:24px;
        }

        .events-head p{
          margin-top:10px;
          line-height:1.7;
          opacity:.7;
        }

        .events-list{
          margin-top:22px;
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .empty-events{
          padding:48px 20px;
          border-radius:24px;
          text-align:center;
          background:rgba(255,255,255,.03);
          border:1px dashed rgba(255,255,255,.08);
        }

        .empty-events strong{
          display:block;
          margin-top:18px;
        }

        .empty-events p{
          margin-top:12px;
          line-height:1.7;
          opacity:.7;
        }

        .event-card{
          display:flex;
          gap:14px;
        }

        .event-dot{
          width:10px;
          height:10px;
          border-radius:50%;
          background:#3b82f6;
          margin-top:16px;
        }

        .event-body{
          flex:1;
          padding:18px;
          border-radius:18px;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
        }

        .event-top{
          display:flex;
          justify-content:space-between;
          gap:16px;
        }

        .event-top span{
          font-size:12px;
          opacity:.65;
        }

        .event-body p{
          margin-top:10px;
          opacity:.7;
        }

        .modal-overlay,
        .popup-overlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.7);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:999;
        }

        .modal,
        .popup{
          width:min(720px,92vw);
          padding:30px;
          border-radius:30px;
          background:#08152f;
          border:1px solid rgba(255,255,255,.08);
        }

        .modal-head{
          display:flex;
          justify-content:space-between;
        }

        .modal-head h2{
          margin:0;
        }

        .modal-head p{
          margin-top:10px;
          opacity:.7;
        }

        .modal-head button{
          width:46px;
          height:46px;
          border:none;
          border-radius:14px;
          background:rgba(255,255,255,.06);
          color:white;
          cursor:pointer;
        }

        .form-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
          margin-top:24px;
        }

        .form-grid input,
        .form-grid select{
          height:58px;
          border:none;
          outline:none;
          border-radius:16px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.08);
          padding:0 16px;
          color:white;
        }

        .form-grid option{
          background:#08152f;
        }

        .submit-btn,
        .popup button{
          width:100%;
          height:58px;
          margin-top:22px;
          border:none;
          border-radius:16px;
          background:linear-gradient(
            135deg,
            #2563eb,
            #14b8a6
          );
          color:white;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          cursor:pointer;
          font-weight:600;
        }

        .popup h3{
          margin:0;
        }

        .popup p{
          margin-top:16px;
          line-height:1.8;
          opacity:.75;
        }

        .as-loading{
          min-height:100vh;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:20px;
        }

        .as-loader{
          width:90px;
          height:90px;
          border-radius:50%;
          border:4px solid rgba(255,255,255,.08);
          border-top-color:#3b82f6;
          animation:spin 1s linear infinite;
        }

                .asset-list,
.detail-layer{
  background:transparent;
  overflow-x:hidden;
}

.asset-list{
  padding-bottom:80px;
}

.detail-layer{
  padding-bottom:80px;
}

.as-left,
.as-right{
  min-height:0;
  padding-bottom:14px;
}

.detail-layer{
  box-sizing:border-box;
}

.asset-list{
  box-sizing:border-box;
}

.as-left{
  height:calc(100vh - 420px);
  min-height:780px;
  overflow-y:auto;
  padding-right:6px;
}

.as-right{
  height:calc(100vh - 420px);
  min-height:780px;
  overflow-y:auto;
  padding-right:6px;
}

.as-left::-webkit-scrollbar,
.as-right::-webkit-scrollbar{
  width:8px;
}

.as-left::-webkit-scrollbar-track,
.as-right::-webkit-scrollbar-track{
  background:transparent;
}

.as-left::-webkit-scrollbar-thumb,
.as-right::-webkit-scrollbar-thumb{
  background:linear-gradient(
    180deg,
    rgba(59,130,246,.35),
    rgba(168,85,247,.35)
  );

  border-radius:999px;

  border:1px solid rgba(255,255,255,.06);
}

.as-left::-webkit-scrollbar-thumb:hover,
.as-right::-webkit-scrollbar-thumb:hover{
  background:linear-gradient(
    180deg,
    rgba(59,130,246,.55),
    rgba(168,85,247,.55)
  );
}

.as-left,
.as-right{
  scrollbar-width:thin;
  scrollbar-color:
    rgba(99,102,241,.5)
    transparent;
}

.empty-state {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  opacity: 0.8;
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.empty-state p {
  max-width: 320px;
  line-height: 1.6;
}

        @keyframes spin{
          to{
            transform:rotate(360deg);
          }
        }

        @media(max-width:1180px){

          .as-main{
            grid-template-columns:1fr;
            height:auto;
          }

          .asset-list{
            height:600px;
          }

          .detail-layer{
            min-height:1000px;
          }

          .ops-grid{
            grid-template-columns:1fr;
          }

          .meta-grid{
            grid-template-columns:1fr;
          }

          .as-hero{
            grid-template-columns:1fr;
          }
        }



      `}</style>

    </div>
  )
}

export default Assets