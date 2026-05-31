import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  Html,
  OrbitControls,
  TransformControls,
  ContactShadows,
  Environment,
  Grid,
  Line,
  Text,
} from "@react-three/drei"
import * as THREE from "three"
import {
  AlertTriangle,
  ArrowLeft,
  BadgeInfo,
  BatteryCharging,
  Boxes,
  Cable,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Factory,
  Gauge,
  HelpCircle,
  Layers3,
  Lightbulb,
  LocateFixed,
  Network,
  PanelTop,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Unplug,
  Wrench,
  X,
  Zap,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { API_BASE } from "../config"

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("authToken") ||
  ""

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
})

const normalize = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")

const isOperational = (status = "") => normalize(status) === "operational"
const isMaintenance = (status = "") => normalize(status).includes("maintenance")
const isCritical = (status = "") =>
  normalize(status).includes("critical") ||
  normalize(status).includes("fault") ||
  normalize(status).includes("inactive")

const getAssetCategory = (asset) =>
  asset?.category || asset?.type || asset?.assetType || "Other"

const getAssetStatusColor = (status = "") => {
  if (isCritical(status)) return "#ff7d6e"
  if (isMaintenance(status)) return "#ffd166"
  if (isOperational(status)) return "#7CFF9B"
  return "#b8c1aa"
}

const getCategoryIcon = (category = "") => {
  const c = normalize(category)

  if (c.includes("substation")) return Network
  if (c.includes("transformer")) return Zap
  if (c.includes("generator")) return Power
  if (c.includes("solar")) return Gauge
  if (c.includes("ups")) return BatteryCharging
  if (c.includes("battery")) return BatteryCharging
  if (c.includes("panel")) return PanelTop
  if (c.includes("motor")) return Gauge
  if (c.includes("pump")) return Wrench
  if (c.includes("street")) return Lightbulb
  if (c.includes("meter")) return Gauge
  if (c.includes("breaker")) return CircuitBoard
  return Boxes
}

const getConnectionColor = (type = "") => {
  if (type === "backup_line") return "#ffd166"
  if (type === "control_line") return "#a985ff"
  if (type === "data_line") return "#66d9ff"
  return "#5efc8d"
}

const formatDate = (value) => {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getSavedPosition = (asset, index = 0) => {
  const p = asset?.position || {}

  const hasRealPosition =
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    typeof p.z === "number" &&
    !(p.x === 0 && p.y === 0 && p.z === 0)

  if (hasRealPosition) return [p.x, p.y, p.z]

  const angle = index * 0.9
  const radius = 3.8 + (index % 4) * 1.2

  return [
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius,
  ]
}

const toBackendPosition = (positionArray) => ({
  x: Number(positionArray[0].toFixed(3)),
  y: Number(positionArray[1].toFixed(3)),
  z: Number(positionArray[2].toFixed(3)),
})

function TopBar() {
  const navigate = useNavigate()

  return (
    <div className="dt-topbar">
      <div className="dt-brand-block" onClick={() => navigate("/admin/dashboard")}>
        <div className="dt-logo-mark">
          <Network size={22} />
        </div>
        <div>
          <p>PowerPulse</p>
          <span>Digital infrastructure twin</span>
        </div>
      </div>

      <div className="dt-topbar-actions">
        <button className="dt-top-icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>

        <button className="dt-top-icon-btn" onClick={() => navigate("/assets")}>
          <Factory size={18} />
          Assets
        </button>

        <button className="dt-top-icon-btn" onClick={() => navigate("/maintenance")}>
          <Wrench size={18} />
          Maintenance
        </button>
      </div>
    </div>
  )
}

function LoaderOverlay() {
  return (
    <div className="dt-loader">
      <div className="dt-loader-orb" />
      <p>Loading twin workspace...</p>
    </div>
  )
}

function Toast({ toast, onClose }) {
  if (!toast) return null

  return (
    <div className={`dt-toast ${toast.type || "info"}`}>
      <div>
        <strong>{toast.title}</strong>
        <span>{toast.message}</span>
      </div>
      <button onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  )
}

function StatusPill({ status }) {
  return (
    <span
      className="dt-status-pill"
      style={{
        "--status-color": getAssetStatusColor(status),
      }}
    >
      <i />
      {status || "Unknown"}
    </span>
  )
}

function AssetLabel({ asset, selected, hidden }) {
  if (hidden) return null

  return (
    <Html
      center
      distanceFactor={selected ? 9 : 12}
      position={[0, selected ? 1.75 : 1.45, 0]}
      className="dt-object-label-wrap"
      zIndexRange={[10, 0]}
    >
      <div className={`dt-object-label ${selected ? "selected" : ""}`}>
        <span
          style={{
            background: getAssetStatusColor(asset.status),
            boxShadow: `0 0 12px ${getAssetStatusColor(asset.status)}`,
          }}
        />
        <p>{asset.name}</p>
      </div>
    </Html>
  )
}

function GlowRing({ color = "#7CFF9B", active }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 4) * 0.08 : 1
    ref.current.scale.setScalar(pulse)
    ref.current.rotation.z = clock.elapsedTime * 0.25
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <torusGeometry args={[1.15, 0.025, 16, 96]} />
      <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.38} />
    </mesh>
  )
}

function BasePad({ selected, simulated, status }) {
  const color = simulated
    ? "#ff7d6e"
    : selected
      ? "#8fffaa"
      : getAssetStatusColor(status)

  return (
    <>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.2, 0.1, 48]} />
        <meshStandardMaterial
          color="#263522"
          roughness={0.8}
          metalness={0.15}
          emissive={color}
          emissiveIntensity={selected || simulated ? 0.12 : 0.035}
        />
      </mesh>
      <GlowRing color={color} active={selected || simulated} />
    </>
  )
}

function SubstationModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[1.45, 0.72, 1.05]} />
        <meshStandardMaterial color="#c6d4bd" roughness={0.62} metalness={0.08} />
      </mesh>

      <mesh castShadow position={[0, 0.86, 0]}>
        <boxGeometry args={[1.6, 0.16, 1.18]} />
        <meshStandardMaterial color="#7d8a6c" roughness={0.7} />
      </mesh>

      {[-0.52, 0, 0.52].map((x) => (
        <group key={x} position={[x, 1.22, -0.16]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.58, 12]} />
            <meshStandardMaterial color="#d9e4d0" metalness={0.25} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#f0f4e8" emissive="#bfff9c" emissiveIntensity={0.08} />
          </mesh>
        </group>
      ))}

      {[-0.68, 0.68].map((x) => (
        <group key={x} position={[x, 0.72, 0.72]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.1, 8]} />
            <meshStandardMaterial color="#d6dfcf" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, 0.48, 0]}>
            <boxGeometry args={[0.55, 0.05, 0.05]} />
            <meshStandardMaterial color="#d6dfcf" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function TransformerModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.45, 0.9, 0.95]} />
        <meshStandardMaterial color="#5e7050" roughness={0.55} metalness={0.18} />
      </mesh>

      {[-0.58, -0.35, -0.12, 0.12, 0.35, 0.58].map((x) => (
        <mesh key={x} castShadow position={[x, 0.56, -0.54]}>
          <boxGeometry args={[0.055, 0.75, 0.08]} />
          <meshStandardMaterial color="#b7c5aa" roughness={0.7} />
        </mesh>
      ))}

      {[-0.42, 0, 0.42].map((x) => (
        <group key={x} position={[x, 1.15, 0.05]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.42, 16]} />
            <meshStandardMaterial color="#e8eee2" roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#b8ffcc" emissiveIntensity={0.08} />
          </mesh>
        </group>
      ))}

      <mesh castShadow position={[0.66, 0.92, 0]}>
        <boxGeometry args={[0.18, 0.22, 0.68]} />
        <meshStandardMaterial color="#26301f" />
      </mesh>
    </group>
  )
}

function GeneratorModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 1.45, 32]} />
        <meshStandardMaterial color="#1f8f76" roughness={0.38} metalness={0.25} />
      </mesh>

      <mesh castShadow position={[-0.78, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 0.22, 32]} />
        <meshStandardMaterial color="#dce8d3" roughness={0.5} />
      </mesh>

      <mesh castShadow position={[0.82, 0.55, 0]}>
        <boxGeometry args={[0.28, 0.46, 0.58]} />
        <meshStandardMaterial color="#32442d" metalness={0.25} roughness={0.45} />
      </mesh>

      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[1.75, 0.14, 0.72]} />
        <meshStandardMaterial color="#202a1e" roughness={0.65} />
      </mesh>
    </group>
  )
}

function SolarInverterModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[1.1, 1.15, 0.34]} />
        <meshStandardMaterial color="#e9eee2" roughness={0.35} metalness={0.08} />
      </mesh>

      <mesh castShadow position={[0, 0.9, 0.19]}>
        <boxGeometry args={[0.62, 0.28, 0.035]} />
        <meshStandardMaterial color="#132015" emissive="#6eff9d" emissiveIntensity={0.2} />
      </mesh>

      <mesh castShadow position={[0, 0.42, 0.2]}>
        <boxGeometry args={[0.78, 0.12, 0.04]} />
        <meshStandardMaterial color="#25321f" />
      </mesh>

      {[-0.34, 0.34].map((x) => (
        <mesh key={x} castShadow position={[x, 0.08, 0.08]}>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 12]} />
          <meshStandardMaterial color="#151c14" />
        </mesh>
      ))}
    </group>
  )
}

function PanelModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.78, 0]}>
        <boxGeometry args={[0.95, 1.45, 0.42]} />
        <meshStandardMaterial color="#384733" roughness={0.48} metalness={0.2} />
      </mesh>

      <mesh castShadow position={[0, 1.2, 0.23]}>
        <boxGeometry args={[0.66, 0.22, 0.035]} />
        <meshStandardMaterial color="#10180f" emissive="#9cffb0" emissiveIntensity={0.14} />
      </mesh>

      {[-0.32, 0, 0.32].map((x) =>
        [-0.1, -0.34, -0.58].map((y) => (
          <mesh key={`${x}-${y}`} castShadow position={[x, 0.9 + y, 0.24]}>
            <boxGeometry args={[0.16, 0.08, 0.04]} />
            <meshStandardMaterial color="#d7e0ce" roughness={0.4} />
          </mesh>
        ))
      )}
    </group>
  )
}

function MotorModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 1.15, 32]} />
        <meshStandardMaterial color="#51746f" roughness={0.42} metalness={0.22} />
      </mesh>

      <mesh castShadow position={[0.68, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.52, 24]} />
        <meshStandardMaterial color="#cbd6c2" metalness={0.5} roughness={0.28} />
      </mesh>

      {[-0.35, -0.1, 0.15, 0.4].map((x) => (
        <mesh key={x} castShadow position={[x, 0.55, -0.43]}>
          <boxGeometry args={[0.045, 0.72, 0.07]} />
          <meshStandardMaterial color="#d8e2cf" />
        </mesh>
      ))}
    </group>
  )
}

function PumpModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[-0.34, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.82, 32]} />
        <meshStandardMaterial color="#4b6b66" roughness={0.45} metalness={0.2} />
      </mesh>

      <mesh castShadow position={[0.42, 0.55, 0]}>
        <sphereGeometry args={[0.42, 32, 24]} />
        <meshStandardMaterial color="#7b8d70" roughness={0.45} metalness={0.2} />
      </mesh>

      <mesh castShadow position={[0.86, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.56, 24]} />
        <meshStandardMaterial color="#cdd8c4" metalness={0.35} roughness={0.35} />
      </mesh>
    </group>
  )
}

function StreetLightModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 1.75, 16]} />
        <meshStandardMaterial color="#cbd7c3" metalness={0.35} roughness={0.3} />
      </mesh>

      <mesh castShadow position={[0.28, 1.76, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.62, 12]} />
        <meshStandardMaterial color="#cbd7c3" metalness={0.35} roughness={0.3} />
      </mesh>

      <mesh castShadow position={[0.62, 1.72, 0]}>
        <sphereGeometry args={[0.18, 24, 16]} />
        <meshStandardMaterial
          color="#fff3b0"
          emissive="#ffd166"
          emissiveIntensity={0.75}
          roughness={0.2}
        />
      </mesh>
    </group>
  )
}

function BatteryBankModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <group key={x} position={[x, 0.48, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.24, 0.75, 0.48]} />
            <meshStandardMaterial color="#303d2b" roughness={0.55} metalness={0.16} />
          </mesh>
          <mesh castShadow position={[0, 0.42, 0]}>
            <boxGeometry args={[0.14, 0.06, 0.32]} />
            <meshStandardMaterial color="#d8e4ce" />
          </mesh>
          <mesh castShadow position={[0, 0.08, 0.25]}>
            <boxGeometry args={[0.14, 0.06, 0.035]} />
            <meshStandardMaterial color="#7CFF9B" emissive="#7CFF9B" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function UPSModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.74, 0]}>
        <boxGeometry args={[0.9, 1.32, 0.62]} />
        <meshStandardMaterial color="#2e3b2a" roughness={0.46} metalness={0.2} />
      </mesh>

      <mesh castShadow position={[0, 1.12, 0.34]}>
        <boxGeometry args={[0.52, 0.22, 0.04]} />
        <meshStandardMaterial color="#11190f" emissive="#6ee7ff" emissiveIntensity={0.2} />
      </mesh>

      <mesh castShadow position={[0, 0.55, 0.35]}>
        <boxGeometry args={[0.58, 0.42, 0.035]} />
        <meshStandardMaterial color="#dbe5d3" roughness={0.45} />
      </mesh>
    </group>
  )
}

function MeterModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[0.86, 1.05, 0.28]} />
        <meshStandardMaterial color="#e5ecdc" roughness={0.42} metalness={0.06} />
      </mesh>

      <mesh castShadow position={[0, 0.9, 0.16]}>
        <boxGeometry args={[0.56, 0.24, 0.035]} />
        <meshStandardMaterial color="#111a10" emissive="#7CFF9B" emissiveIntensity={0.16} />
      </mesh>

      <mesh castShadow position={[0, 0.52, 0.17]}>
        <cylinderGeometry args={[0.22, 0.22, 0.035, 32]} />
        <meshStandardMaterial color="#273121" />
      </mesh>

      <mesh castShadow position={[0.16, 0.08, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.45, 12]} />
        <meshStandardMaterial color="#121912" />
      </mesh>
    </group>
  )
}

function BreakerModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.62, 0]}>
        <boxGeometry args={[0.88, 1.05, 0.46]} />
        <meshStandardMaterial color="#2f3c2a" roughness={0.45} metalness={0.18} />
      </mesh>

      <mesh castShadow position={[0, 0.68, 0.28]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[0.18, 0.64, 0.08]} />
        <meshStandardMaterial color="#f3f7ea" roughness={0.3} />
      </mesh>

      <mesh castShadow position={[0, 1.12, 0.25]}>
        <boxGeometry args={[0.48, 0.08, 0.05]} />
        <meshStandardMaterial color="#ff7d6e" emissive="#ff7d6e" emissiveIntensity={0.18} />
      </mesh>
    </group>
  )
}

function GenericAssetModel({ selected, simulated, status }) {
  return (
    <group>
      <BasePad selected={selected} simulated={simulated} status={status} />

      <mesh castShadow position={[0, 0.6, 0]}>
        <dodecahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial color="#aebba5" roughness={0.5} metalness={0.12} />
      </mesh>

      <mesh castShadow position={[0, 1.16, 0]}>
        <boxGeometry args={[0.62, 0.12, 0.62]} />
        <meshStandardMaterial color="#526248" roughness={0.5} />
      </mesh>
    </group>
  )
}

function AssetModel({ asset, selected, connectSource, simulated, impacted }) {
  const category = normalize(getAssetCategory(asset))

  const modelProps = {
    selected: selected || connectSource,
    simulated: simulated || impacted,
    status: asset.status,
  }

  if (category.includes("substation")) return <SubstationModel {...modelProps} />
  if (category.includes("transformer")) return <TransformerModel {...modelProps} />
  if (category.includes("generator")) return <GeneratorModel {...modelProps} />
  if (category.includes("solar")) return <SolarInverterModel {...modelProps} />
  if (category.includes("panel")) return <PanelModel {...modelProps} />
  if (category.includes("motor")) return <MotorModel {...modelProps} />
  if (category.includes("pump")) return <PumpModel {...modelProps} />
  if (category.includes("street")) return <StreetLightModel {...modelProps} />
  if (category.includes("battery")) return <BatteryBankModel {...modelProps} />
  if (category.includes("ups")) return <UPSModel {...modelProps} />
  if (category.includes("meter")) return <MeterModel {...modelProps} />
  if (category.includes("breaker")) return <BreakerModel {...modelProps} />

  return <GenericAssetModel {...modelProps} />
}

function TwinAsset({
  asset,
  index,
  selectedId,
  connectSourceId,
  simulatedId,
  impactedIds,
  labelsHidden,
  moveMode,
  onSelect,
  onPositionCommit,
}) {
  const groupRef = useRef()
  const transformRef = useRef()
  const orbit = useThree((state) => state.controls)

  const selected = selectedId === asset._id
  const connectSource = connectSourceId === asset._id
  const simulated = simulatedId === asset._id
  const impacted = impactedIds.includes(asset._id)

  const initialPosition = useMemo(() => getSavedPosition(asset, index), [asset, index])
  const [position, setPosition] = useState(initialPosition)

  useEffect(() => {
    setPosition(initialPosition)
  }, [initialPosition])

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    if (!selected && !moveMode) {
      groupRef.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 1.2 + index) * 0.025
    }

    if (simulated) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 7) * 0.035
      groupRef.current.scale.setScalar(pulse)
    } else if (impacted) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.02
      groupRef.current.scale.setScalar(pulse)
    } else {
      groupRef.current.scale.setScalar(1)
    }
  })

  const commitPosition = useCallback(() => {
    if (!groupRef.current) return

    const next = [
      groupRef.current.position.x,
      0,
      groupRef.current.position.z,
    ]

    groupRef.current.position.y = 0
    setPosition(next)
    onPositionCommit(asset._id, next)
  }, [asset._id, onPositionCommit])

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(asset)
        }}
      >
        <AssetModel
          asset={asset}
          selected={selected}
          connectSource={connectSource}
          simulated={simulated}
          impacted={impacted}
        />

        <AssetLabel asset={asset} selected={selected} hidden={labelsHidden} />

        {selected && (
          <Text
            position={[0, 2.1, 0]}
            fontSize={0.16}
            color="#eff7e8"
            anchorX="center"
            anchorY="middle"
            outlineColor="#0e150d"
            outlineWidth={0.01}
          >
            {getAssetCategory(asset)}
          </Text>
        )}
      </group>

      {selected && moveMode && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode="translate"
          showY={false}
          size={0.9}
          onMouseDown={() => {
            if (orbit) orbit.enabled = false
          }}
          onMouseUp={() => {
            if (orbit) orbit.enabled = true
            commitPosition()
          }}
        />
      )}
    </>
  )
}

function ConnectionCable({ connection, assetsById, simulatedId, impactedIds, onSelect }) {
  const fromId = connection?.fromAsset?._id || connection?.fromAsset
  const toId = connection?.toAsset?._id || connection?.toAsset

  const from = assetsById[fromId]
  const to = assetsById[toId]

  if (!from || !to) return null

  const fromPos = getSavedPosition(from)
  const toPos = getSavedPosition(to)

  const active =
    simulatedId === fromId ||
    simulatedId === toId ||
    impactedIds.includes(fromId) ||
    impactedIds.includes(toId)

  const color = active ? "#ffcf6e" : getConnectionColor(connection.connectionType)

  const points = [
    new THREE.Vector3(fromPos[0], 0.72, fromPos[2]),
    new THREE.Vector3(
      (fromPos[0] + toPos[0]) / 2,
      1.15,
      (fromPos[2] + toPos[2]) / 2
    ),
    new THREE.Vector3(toPos[0], 0.72, toPos[2]),
  ]

  return (
    <group onClick={(event) => {
      event.stopPropagation()
      onSelect?.(connection)
    }}>
      <Line
        points={points}
        color={color}
        lineWidth={active ? 4 : 2}
        transparent
        opacity={active ? 0.95 : 0.62}
      />
      <Line
        points={points}
        color={color}
        lineWidth={active ? 10 : 6}
        transparent
        opacity={active ? 0.16 : 0.08}
      />
    </group>
  )
}

function EmptyWorkspaceHint({ visible, onAdd }) {
  if (!visible) return null

  return (
    <Html center position={[0, 1.2, 0]} className="dt-empty-3d-wrap">
      <div className="dt-empty-3d">
        <div className="dt-empty-icon">
          <Layers3 size={28} />
        </div>
        <h2>Start building your digital twin</h2>
        <p>
          Add registered infrastructure assets, place them in the workspace,
          and connect them into your own electrical network.
        </p>
        <button onClick={onAdd}>
          <Plus size={17} />
          Add first asset
        </button>
      </div>
    </Html>
  )
}

function CameraResetter({ resetKey }) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(7, 6, 8)
    camera.lookAt(0, 0, 0)
  }, [camera, resetKey])

  return null
}

function TwinScene({
  visibleAssets,
  visibleConnections,
  selectedAsset,
  connectSourceId,
  simulatedId,
  impactedIds,
  labelsHidden,
  moveMode,
  resetKey,
  onSelectAsset,
  onCanvasClick,
  onPositionCommit,
  onOpenAdd,
  onSelectConnection,
}) {
  const assetsById = useMemo(() => {
    const map = {}
    visibleAssets.forEach((asset) => {
      map[asset._id] = asset
    })
    return map
  }, [visibleAssets])

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [7, 6, 8], fov: 45 }}
      onPointerMissed={onCanvasClick}
    >
      <color attach="background" args={["#10190f"]} />
      <fog attach="fog" args={["#10190f", 12, 30]} />

      <Suspense fallback={null}>
        <ambientLight intensity={0.58} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.25}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-4, 4, -4]} intensity={1.5} color="#8fffaa" />
        <pointLight position={[4, 3, 4]} intensity={0.7} color="#ffd166" />

        <Environment preset="warehouse" />

        <CameraResetter resetKey={resetKey} />

        <Grid
          args={[42, 42]}
          cellSize={0.75}
          cellThickness={0.45}
          cellColor="#d8ead0"
          sectionSize={3}
          sectionThickness={0.85}
          sectionColor="#7d9270"
          fadeDistance={25}
          fadeStrength={1.8}
          position={[0, -0.01, 0]}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#182314" roughness={0.92} metalness={0.05} />
        </mesh>

        {visibleConnections.map((connection) => (
          <ConnectionCable
            key={connection._id}
            connection={connection}
            assetsById={assetsById}
            simulatedId={simulatedId}
            impactedIds={impactedIds}
            onSelect={onSelectConnection}
          />
        ))}

        {visibleAssets.map((asset, index) => (
          <TwinAsset
            key={asset._id}
            asset={asset}
            index={index}
            selectedId={selectedAsset?._id}
            connectSourceId={connectSourceId}
            simulatedId={simulatedId}
            impactedIds={impactedIds}
            labelsHidden={labelsHidden}
            moveMode={moveMode}
            onSelect={onSelectAsset}
            onPositionCommit={onPositionCommit}
          />
        ))}

        <EmptyWorkspaceHint
          visible={visibleAssets.length === 0}
          onAdd={onOpenAdd}
        />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.35}
          scale={28}
          blur={2.4}
          far={7}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Suspense>
    </Canvas>
  )
}

function AddAssetModal({
  open,
  assets,
  visibleAssets,
  onClose,
  onAddAsset,
}) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  const visibleIds = useMemo(
    () => new Set(visibleAssets.map((asset) => asset._id)),
    [visibleAssets]
  )

  const availableAssets = useMemo(() => {
    return assets
      .filter((asset) => !asset.isInTwin && !visibleIds.has(asset._id))
      .filter((asset) => {
        const text = `${asset.name} ${asset.assetId} ${getAssetCategory(asset)} ${asset.location}`
        return normalize(text).includes(normalize(query))
      })
  }, [assets, query, visibleIds])

  if (!open) return null

  return (
    <div className="dt-modal-backdrop">
      <div className="dt-add-modal">
        <div className="dt-modal-head">
          <div>
            <span>Infrastructure Registry</span>
            <h2>Add assets to twin</h2>
            <p>
              Choose registered assets. Only selected assets will appear in this
              digital twin workspace.
            </p>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dt-modal-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search asset name, ID, category, location..."
          />
        </div>

        {availableAssets.length === 0 ? (
          <div className="dt-empty-list">
            <Factory size={34} />
            <h3>No available assets</h3>
            <p>
              Every registered asset is already placed in this workspace, or no
              assets match your search.
            </p>
          </div>
        ) : (
          <div className="dt-asset-picker-grid">
            {availableAssets.map((asset) => {
              const Icon = getCategoryIcon(getAssetCategory(asset))

              return (
                <button
                  key={asset._id}
                  className="dt-picker-card"
                  onClick={() => onAddAsset(asset)}
                >
                  <div className="dt-picker-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3>{asset.name}</h3>
                    <p>{asset.assetId || "No asset ID"}</p>
                    <span>{getAssetCategory(asset)}</span>
                  </div>
                  <StatusPill status={asset.status} />
                  <ChevronRight size={18} className="dt-picker-arrow" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function HelpPanel({ open, onClose }) {
  if (!open) return null

  return (
    <div className="dt-help-panel">
      <div className="dt-help-head">
        <div>
          <span>Workspace guide</span>
          <h3>How to use Digital Twin</h3>
        </div>
        <button onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <div className="dt-help-steps">
        <div>
          <b>1</b>
          <p>Add registered assets using the Add Asset button.</p>
        </div>
        <div>
          <b>2</b>
          <p>Click an asset to inspect it and activate actions.</p>
        </div>
        <div>
          <b>3</b>
          <p>Turn on Move Mode, drag the arrows, then release to save position.</p>
        </div>
        <div>
          <b>4</b>
          <p>Turn on Connect Mode, click source asset, then target asset.</p>
        </div>
        <div>
          <b>5</b>
          <p>Select an asset and run failure simulation to see impact.</p>
        </div>
      </div>

      <div className="dt-help-controls">
        <p><b>Mouse wheel:</b> zoom</p>
        <p><b>Left drag empty space:</b> rotate view</p>
        <p><b>Right drag / two-finger drag:</b> pan view</p>
      </div>
    </div>
  )
}

function AssetInspector({
  asset,
  maintenance,
  tickets,
  connections,
  visibleAssets,
  simulatedId,
  impactedAssets,
  onClose,
  onRemove,
  onSimulate,
}) {
  if (!asset) return null

  const assetMaintenance = maintenance.filter((item) => {
    const assetId = item?.asset?._id || item?.asset
    return assetId === asset._id
  })

  const assetTickets = tickets.filter((ticket) => {
    const assetId = ticket?.asset?._id || ticket?.asset
    return assetId === asset._id
  })

  const relatedConnections = connections.filter((connection) => {
    const fromId = connection?.fromAsset?._id || connection?.fromAsset
    const toId = connection?.toAsset?._id || connection?.toAsset
    return fromId === asset._id || toId === asset._id
  })

  const impactedNames = impactedAssets.map((item) => item.name).join(", ")

  const Icon = getCategoryIcon(getAssetCategory(asset))

  return (
    <aside className="dt-inspector">
      <div className="dt-inspector-head">
        <div className="dt-inspector-icon">
          <Icon size={24} />
        </div>
        <div>
          <span>{getAssetCategory(asset)}</span>
          <h2>{asset.name}</h2>
          <StatusPill status={asset.status} />
        </div>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="dt-inspector-scroll">
        <section className="dt-inspector-section">
          <h3>
            <Boxes size={17} />
            Asset context
          </h3>

          <div className="dt-kv-grid">
            <div>
              <span>Asset ID</span>
              <b>{asset.assetId || "Not added"}</b>
            </div>
            <div>
              <span>Location</span>
              <b>{asset.location || "Not set"}</b>
            </div>
            <div>
              <span>Manufacturer</span>
              <b>{asset.manufacturer || "N/A"}</b>
            </div>
            <div>
              <span>Capacity</span>
              <b>{asset.capacity || "N/A"}</b>
            </div>
            <div>
              <span>Installed</span>
              <b>{formatDate(asset.installationDate)}</b>
            </div>
            <div>
              <span>Position</span>
              <b>
                {asset.position
                  ? `${Number(asset.position.x || 0).toFixed(1)}, ${Number(asset.position.z || 0).toFixed(1)}`
                  : "Not saved"}
              </b>
            </div>
          </div>
        </section>

        <section className="dt-inspector-section">
          <h3>
            <Wrench size={17} />
            Operational links
          </h3>

          <div className="dt-link-summary">
            <div>
              <span>Maintenance</span>
              <b>{assetMaintenance.length}</b>
            </div>
            <div>
              <span>Tickets</span>
              <b>{assetTickets.length}</b>
            </div>
            <div>
              <span>Connections</span>
              <b>{relatedConnections.length}</b>
            </div>
          </div>

          {relatedConnections.length === 0 ? (
            <p className="dt-muted">No network connections created yet.</p>
          ) : (
            <div className="dt-mini-list">
              {relatedConnections.map((connection) => {
                const fromId = connection?.fromAsset?._id || connection?.fromAsset
                const toId = connection?.toAsset?._id || connection?.toAsset
                const otherId = fromId === asset._id ? toId : fromId
                const other = visibleAssets.find((item) => item._id === otherId)

                return (
                  <div key={connection._id}>
                    <Cable size={15} />
                    <span>{other?.name || "Connected asset"}</span>
                    <b>{connection.connectionType?.replace("_", " ")}</b>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className={`dt-inspector-section ${simulatedId === asset._id ? "danger" : ""}`}>
          <h3>
            <ShieldAlert size={17} />
            Failure simulation
          </h3>

          {simulatedId === asset._id ? (
            <>
              <p className="dt-impact-text">
                Simulated failure is active. Connected assets are highlighted as
                impacted nodes.
              </p>

              <div className="dt-impact-box">
                <span>Impacted assets</span>
                <b>{impactedAssets.length}</b>
                <p>{impactedNames || "No directly connected assets."}</p>
              </div>
            </>
          ) : (
            <p className="dt-muted">
              Run a what-if failure check to visualize connected impact.
            </p>
          )}
        </section>
      </div>

      <div className="dt-inspector-actions">
        <button className="dt-danger-soft" onClick={() => onSimulate(asset)}>
          <ShieldAlert size={17} />
          {simulatedId === asset._id ? "Stop Simulation" : "Simulate Failure"}
        </button>

        <button className="dt-remove-btn" onClick={() => onRemove(asset)}>
          <Unplug size={17} />
          Remove from Twin
        </button>
      </div>
    </aside>
  )
}

function ConnectionPanel({ connection, onDelete, onClose }) {
  if (!connection) return null

  return (
    <div className="dt-connection-panel">
      <button className="dt-connection-close" onClick={onClose}>
        <X size={16} />
      </button>

      <span>Selected connection</span>
      <h3>
        {(connection.fromAsset?.name || "Asset")} →{" "}
        {(connection.toAsset?.name || "Asset")}
      </h3>
      <p>{connection.connectionType?.replace("_", " ") || "power line"}</p>

      <button onClick={() => onDelete(connection)}>
        <Trash2 size={16} />
        Delete connection
      </button>
    </div>
  )
}

export default function DigitalTwin() {
  const [assets, setAssets] = useState([])
  const [tickets, setTickets] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [connections, setConnections] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [selectedConnection, setSelectedConnection] = useState(null)

  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const [moveMode, setMoveMode] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState(null)

  const [simulatedId, setSimulatedId] = useState(null)
  const [resetKey, setResetKey] = useState(0)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((title, message, type = "info") => {
    setToast({ title, message, type })
    window.clearTimeout(window.__dtToastTimer)
    window.__dtToastTimer = window.setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchTwin = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(`${API_BASE}/api/digital-twin`, {
        headers: authHeaders(),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Unable to load digital twin")
      }

      setAssets(Array.isArray(data.assets) ? data.assets : [])
      setTickets(Array.isArray(data.tickets) ? data.tickets : [])
      setMaintenance(Array.isArray(data.maintenance) ? data.maintenance : [])
      setConnections(Array.isArray(data.connections) ? data.connections : [])
    } catch (error) {
      showToast("Digital Twin error", error.message, "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchTwin()
  }, [fetchTwin])

  const visibleAssets = useMemo(
    () => assets.filter((asset) => asset.isInTwin === true),
    [assets]
  )

  const visibleAssetIds = useMemo(
    () => new Set(visibleAssets.map((asset) => asset._id)),
    [visibleAssets]
  )

  const visibleConnections = useMemo(() => {
    return connections.filter((connection) => {
      const fromId = connection?.fromAsset?._id || connection?.fromAsset
      const toId = connection?.toAsset?._id || connection?.toAsset
      return visibleAssetIds.has(fromId) && visibleAssetIds.has(toId)
    })
  }, [connections, visibleAssetIds])

  const impactedIds = useMemo(() => {
    if (!simulatedId) return []

    const ids = new Set()

    visibleConnections.forEach((connection) => {
      const fromId = connection?.fromAsset?._id || connection?.fromAsset
      const toId = connection?.toAsset?._id || connection?.toAsset

      if (fromId === simulatedId) ids.add(toId)
      if (toId === simulatedId) ids.add(fromId)
    })

    return Array.from(ids)
  }, [simulatedId, visibleConnections])

  const impactedAssets = useMemo(
    () => visibleAssets.filter((asset) => impactedIds.includes(asset._id)),
    [visibleAssets, impactedIds]
  )

  const updateAssetInState = useCallback((updatedAsset) => {
    setAssets((prev) =>
      prev.map((asset) => (asset._id === updatedAsset._id ? updatedAsset : asset))
    )

    setSelectedAsset((prev) =>
      prev?._id === updatedAsset._id ? updatedAsset : prev
    )
  }, [])

  const handleAddAsset = async (asset) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/digital-twin/assets/${asset._id}/twin-visibility`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ isInTwin: true }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Unable to add asset to twin")
      }

      const index = visibleAssets.length
      const initialPosition = toBackendPosition(getSavedPosition(data, index))

      const positionRes = await fetch(
        `${API_BASE}/api/digital-twin/assets/${asset._id}/position`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ position: initialPosition }),
        }
      )

      const positionData = await positionRes.json()

      if (!positionRes.ok) {
        throw new Error(positionData.message || "Asset added, but position save failed")
      }

      updateAssetInState(positionData)
      setSelectedAsset(positionData)
      setMoveMode(true)
      setAddModalOpen(false)
      showToast(
        "Asset added",
        "Move Mode is active. Drag the arrows to place the asset.",
        "success"
      )
    } catch (error) {
      showToast("Add asset failed", error.message, "error")
    }
  }

  const handleRemoveFromTwin = async (asset) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/digital-twin/assets/${asset._id}/twin-visibility`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ isInTwin: false }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Unable to remove asset from twin")
      }

      updateAssetInState(data)

      setConnections((prev) =>
        prev.filter((connection) => {
          const fromId = connection?.fromAsset?._id || connection?.fromAsset
          const toId = connection?.toAsset?._id || connection?.toAsset
          return fromId !== asset._id && toId !== asset._id
        })
      )

      if (selectedAsset?._id === asset._id) setSelectedAsset(null)
      if (simulatedId === asset._id) setSimulatedId(null)

      showToast("Removed from twin", "Asset remains in registry, but is hidden from this workspace.", "success")
    } catch (error) {
      showToast("Remove failed", error.message, "error")
    }
  }

  const handlePositionCommit = async (assetId, positionArray) => {
    try {
      const position = toBackendPosition(positionArray)

      const res = await fetch(`${API_BASE}/api/digital-twin/assets/${assetId}/position`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ position }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Unable to save position")
      }

      updateAssetInState(data)
      showToast("Position saved", "Asset placement updated in digital twin.", "success")
    } catch (error) {
      showToast("Position save failed", error.message, "error")
    }
  }

  const handleSelectAsset = async (asset) => {
    setSelectedConnection(null)

    if (connectMode) {
      if (!connectSourceId) {
        setConnectSourceId(asset._id)
        setSelectedAsset(asset)
        showToast("Source selected", "Now click the target asset to create a connection.", "info")
        return
      }

      if (connectSourceId === asset._id) {
        showToast("Choose another asset", "Source and target cannot be the same.", "error")
        return
      }

      try {
        const res = await fetch(`${API_BASE}/api/digital-twin/connections`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            fromAsset: connectSourceId,
            toAsset: asset._id,
            connectionType: "power_line",
            label: "",
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message || "Unable to create connection")
        }

        setConnections((prev) => [data, ...prev])
        setConnectMode(false)
        setConnectSourceId(null)
        setSelectedAsset(asset)
        showToast("Connection created", "Electrical link added to the twin workspace.", "success")
      } catch (error) {
        showToast("Connection failed", error.message, "error")
      }

      return
    }

    setSelectedAsset(asset)
  }

  const handleDeleteConnection = async (connection) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/digital-twin/connections/${connection._id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Unable to delete connection")
      }

      setConnections((prev) => prev.filter((item) => item._id !== connection._id))
      setSelectedConnection(null)
      showToast("Connection removed", "Network link deleted from workspace.", "success")
    } catch (error) {
      showToast("Delete failed", error.message, "error")
    }
  }

  const handleSimulate = (asset) => {
    if (simulatedId === asset._id) {
      setSimulatedId(null)
      showToast("Simulation stopped", "Workspace returned to normal view.", "info")
      return
    }

    setSimulatedId(asset._id)
    setSelectedAsset(asset)
    showToast(
      "Failure simulation active",
      "Connected assets are highlighted as impacted nodes.",
      "warning"
    )
  }

  const handleCanvasClick = () => {
    if (!connectMode) {
      setSelectedConnection(null)
      return
    }
  }

  const labelsHidden = addModalOpen || Boolean(selectedConnection)

  const instructionText = useMemo(() => {
    if (connectMode && !connectSourceId) return "Connect Mode: click the source asset."
    if (connectMode && connectSourceId) return "Connect Mode: click the target asset."
    if (moveMode && selectedAsset) return "Move Mode: drag the arrows. Release to save position."
    if (simulatedId) return "Simulation active: red asset failed, amber assets are impacted."
    return "Click an asset to inspect. Use Add Asset to build your workspace."
  }, [connectMode, connectSourceId, moveMode, selectedAsset, simulatedId])

  return (
    <div className="digital-twin-page">
      <style>{digitalTwinStyles}</style>

      <TopBar />

      <main className="dt-shell">
        <div className="dt-hero-strip">
          <div className="dt-title-card">
            <div className="dt-title-icon">
              <Layers3 size={26} />
            </div>
            <div>
              <span>Network simulation layer</span>
              <h1>Digital Twin Workspace</h1>
              <p>{instructionText}</p>
            </div>
          </div>

          <div className="dt-command-bar">
            <button className="dt-command-btn primary" onClick={() => setAddModalOpen(true)}>
              <Plus size={18} />
              Add Asset
            </button>

            <button
              className={`dt-command-btn ${moveMode ? "active" : ""}`}
              onClick={() => {
                if (!selectedAsset && !moveMode) {
                  showToast("Select an asset", "Click an asset first, then enable Move Mode.", "info")
                  return
                }
                setMoveMode((prev) => !prev)
                setConnectMode(false)
                setConnectSourceId(null)
              }}
            >
              <LocateFixed size={18} />
              Move Mode
            </button>

            <button
              className={`dt-command-btn ${connectMode ? "active" : ""}`}
              onClick={() => {
                setConnectMode((prev) => !prev)
                setConnectSourceId(null)
                setMoveMode(false)
                setSimulatedId(null)
              }}
            >
              <Cable size={18} />
              Connect Mode
            </button>

            <button
              className={`dt-command-btn ${simulatedId ? "danger-active" : ""}`}
              onClick={() => {
                if (!selectedAsset) {
                  showToast("Select an asset", "Choose an asset before running simulation.", "info")
                  return
                }
                handleSimulate(selectedAsset)
              }}
            >
              <ShieldAlert size={18} />
              {simulatedId ? "Stop Simulation" : "Simulate Failure"}
            </button>

            <button
              className="dt-command-btn"
              onClick={() => setResetKey((prev) => prev + 1)}
            >
              <RefreshCw size={18} />
              Reset View
            </button>

            <button className="dt-command-btn help" onClick={() => setHelpOpen(true)}>
              <HelpCircle size={18} />
              Help
            </button>
          </div>
        </div>

        <section className="dt-workspace">
          <TwinScene
            visibleAssets={visibleAssets}
            visibleConnections={visibleConnections}
            selectedAsset={selectedAsset}
            connectSourceId={connectSourceId}
            simulatedId={simulatedId}
            impactedIds={impactedIds}
            labelsHidden={labelsHidden}
            moveMode={moveMode}
            resetKey={resetKey}
            onSelectAsset={handleSelectAsset}
            onCanvasClick={handleCanvasClick}
            onPositionCommit={handlePositionCommit}
            onOpenAdd={() => setAddModalOpen(true)}
            onSelectConnection={(connection) => {
              setSelectedConnection(connection)
              setSelectedAsset(null)
            }}
          />

          <div className="dt-workspace-legend">
            <div className="dt-legend-head">
              <CircuitBoard size={17} />
              Workspace
            </div>
            <p>{visibleAssets.length} assets placed</p>
            <div className="dt-legend-row">
              <i style={{ background: "#7CFF9B" }} />
              Operational
            </div>
            <div className="dt-legend-row">
              <i style={{ background: "#ffd166" }} />
              Maintenance
            </div>
            <div className="dt-legend-row">
              <i style={{ background: "#ff7d6e" }} />
              Critical / simulated
            </div>
            <div className="dt-legend-row">
              <i style={{ background: "#9dffb2", boxShadow: "0 0 14px #9dffb2" }} />
              Selected
            </div>
          </div>

          <div className="dt-mini-guide">
            <BadgeInfo size={16} />
            <span>{instructionText}</span>
          </div>

          {loading && <LoaderOverlay />}
        </section>
      </main>

      <AddAssetModal
        open={addModalOpen}
        assets={assets}
        visibleAssets={visibleAssets}
        onClose={() => setAddModalOpen(false)}
        onAddAsset={handleAddAsset}
      />

      <AssetInspector
        asset={selectedAsset}
        maintenance={maintenance}
        tickets={tickets}
        connections={visibleConnections}
        visibleAssets={visibleAssets}
        simulatedId={simulatedId}
        impactedAssets={impactedAssets}
        onClose={() => {
          setSelectedAsset(null)
          setMoveMode(false)
        }}
        onRemove={handleRemoveFromTwin}
        onSimulate={handleSimulate}
      />

      <ConnectionPanel
        connection={selectedConnection}
        onDelete={handleDeleteConnection}
        onClose={() => setSelectedConnection(null)}
      />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

const digitalTwinStyles = `
.digital-twin-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 15% 12%, rgba(126, 255, 155, 0.09), transparent 30%),
    radial-gradient(circle at 85% 18%, rgba(255, 209, 102, 0.08), transparent 28%),
    linear-gradient(135deg, #5f6d46 0%, #4d5b3d 45%, #1a2417 100%);
  color: #f3f8ee;
  overflow-x: hidden;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.dt-topbar {
  height: 86px;
  padding: 18px 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 30;
}

.dt-brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  user-select: none;
}

.dt-logo-mark {
  width: 54px;
  height: 54px;
  border: 1px solid rgba(240, 248, 232, 0.18);
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(16, 25, 15, 0.2);
  box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.03);
}

.dt-brand-block p {
  margin: 0;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.dt-brand-block span {
  display: block;
  margin-top: 3px;
  color: rgba(243, 248, 238, 0.62);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.dt-topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dt-top-icon-btn {
  height: 44px;
  border: 1px solid rgba(243, 248, 238, 0.16);
  background: rgba(17, 26, 15, 0.24);
  color: #f3f8ee;
  border-radius: 15px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-weight: 900;
  cursor: pointer;
  transition: 0.2s ease;
}

.dt-top-icon-btn:hover {
  transform: translateY(-1px);
  background: rgba(243, 248, 238, 0.1);
}

.dt-shell {
  padding: 0 30px 30px;
  position: relative;
  z-index: 2;
}

.dt-hero-strip {
  min-height: 96px;
  display: grid;
  grid-template-columns: minmax(360px, 0.85fr) 1.15fr;
  gap: 18px;
  align-items: stretch;
  margin-bottom: 18px;
}

.dt-title-card,
.dt-command-bar {
  border: 1px solid rgba(243, 248, 238, 0.17);
  background:
    linear-gradient(135deg, rgba(18, 28, 16, 0.62), rgba(18, 28, 16, 0.28));
  border-radius: 26px;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.dt-title-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 22px;
}

.dt-title-icon {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(126, 255, 155, 0.18), rgba(102, 217, 255, 0.08));
  border: 1px solid rgba(126, 255, 155, 0.2);
}

.dt-title-card span {
  color: rgba(243, 248, 238, 0.58);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.dt-title-card h1 {
  margin: 3px 0 5px;
  font-size: clamp(28px, 3.2vw, 46px);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.dt-title-card p {
  margin: 0;
  color: rgba(243, 248, 238, 0.68);
  font-size: 13px;
  font-weight: 750;
  max-width: 700px;
}

.dt-command-bar {
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.dt-command-btn {
  height: 52px;
  border: 1px solid rgba(243, 248, 238, 0.17);
  border-radius: 18px;
  background: rgba(243, 248, 238, 0.08);
  color: #f5fbef;
  padding: 0 17px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 950;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}

.dt-command-btn:hover {
  transform: translateY(-1px);
  background: rgba(243, 248, 238, 0.13);
}

.dt-command-btn.primary {
  background:
    linear-gradient(135deg, rgba(126, 255, 155, 0.22), rgba(102, 217, 255, 0.13));
  border-color: rgba(126, 255, 155, 0.25);
}

.dt-command-btn.active {
  background: rgba(126, 255, 155, 0.18);
  border-color: rgba(126, 255, 155, 0.42);
  box-shadow: 0 0 28px rgba(126, 255, 155, 0.12);
}

.dt-command-btn.danger-active {
  background: rgba(255, 125, 110, 0.18);
  border-color: rgba(255, 125, 110, 0.42);
}

.dt-command-btn.help {
  background: rgba(255, 209, 102, 0.09);
}

.dt-workspace {
  height: calc(100vh - 230px);
  min-height: 610px;
  border: 1px solid rgba(243, 248, 238, 0.18);
  border-radius: 34px;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(circle at center, rgba(126, 255, 155, 0.08), transparent 34%),
    linear-gradient(135deg, rgba(14, 22, 13, 0.92), rgba(25, 36, 20, 0.84));
  box-shadow:
    0 35px 100px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

.dt-workspace canvas {
  display: block;
  outline: none;
}

.dt-workspace-legend {
  position: absolute;
  left: 24px;
  bottom: 24px;
  width: 270px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(243, 248, 238, 0.13);
  background: rgba(15, 23, 14, 0.76);
  backdrop-filter: blur(16px);
  box-shadow: 0 22px 55px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.dt-legend-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 950;
  font-size: 15px;
}

.dt-workspace-legend p {
  margin: 6px 0 12px;
  color: rgba(243, 248, 238, 0.62);
  font-size: 12px;
  font-weight: 800;
}

.dt-legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(243, 248, 238, 0.78);
  font-size: 13px;
  font-weight: 850;
  margin-top: 9px;
}

.dt-legend-row i {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.dt-mini-guide {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 24px;
  max-width: 560px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(243, 248, 238, 0.14);
  background: rgba(15, 23, 14, 0.72);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(243, 248, 238, 0.78);
  font-size: 13px;
  font-weight: 850;
  pointer-events: none;
}

.dt-object-label-wrap {
  pointer-events: none;
}

.dt-object-label {
  min-width: 88px;
  max-width: 150px;
  height: 25px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(8, 13, 8, 0.82);
  border: 1px solid rgba(243, 248, 238, 0.12);
  display: flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.32);
}

.dt-object-label.selected {
  background: rgba(21, 40, 23, 0.94);
  border-color: rgba(126, 255, 155, 0.35);
}

.dt-object-label span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.dt-object-label p {
  margin: 0;
  color: #f5fbef;
  font-size: 9px;
  font-weight: 950;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dt-empty-3d-wrap {
  pointer-events: auto;
}

.dt-empty-3d {
  width: 430px;
  padding: 28px;
  border-radius: 30px;
  border: 1px solid rgba(243, 248, 238, 0.16);
  background: rgba(13, 20, 12, 0.78);
  backdrop-filter: blur(16px);
  text-align: center;
  box-shadow: 0 28px 70px rgba(0,0,0,0.32);
}

.dt-empty-icon {
  width: 66px;
  height: 66px;
  margin: 0 auto 16px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: rgba(126, 255, 155, 0.12);
  border: 1px solid rgba(126, 255, 155, 0.2);
}

.dt-empty-3d h2 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.dt-empty-3d p {
  color: rgba(243, 248, 238, 0.66);
  font-size: 14px;
  font-weight: 750;
  line-height: 1.55;
}

.dt-empty-3d button {
  height: 48px;
  border: 0;
  border-radius: 16px;
  padding: 0 18px;
  background: linear-gradient(135deg, #2e78ff, #12bfae);
  color: white;
  font-weight: 950;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
}

.dt-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(7, 12, 7, 0.72);
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.dt-add-modal {
  width: min(980px, 96vw);
  max-height: min(760px, 88vh);
  border-radius: 32px;
  border: 1px solid rgba(243, 248, 238, 0.16);
  background:
    radial-gradient(circle at 20% 0%, rgba(126, 255, 155, 0.08), transparent 34%),
    rgba(18, 28, 16, 0.94);
  box-shadow: 0 35px 110px rgba(0,0,0,0.42);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dt-modal-head {
  padding: 24px 26px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid rgba(243, 248, 238, 0.1);
}

.dt-modal-head span {
  color: rgba(243, 248, 238, 0.56);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.dt-modal-head h2 {
  margin: 5px 0 6px;
  font-size: 32px;
  letter-spacing: -0.045em;
}

.dt-modal-head p {
  margin: 0;
  color: rgba(243, 248, 238, 0.62);
  font-size: 13px;
  font-weight: 750;
}

.dt-modal-head button,
.dt-help-head button,
.dt-inspector-head button,
.dt-connection-close {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(243, 248, 238, 0.13);
  background: rgba(243, 248, 238, 0.08);
  color: #f3f8ee;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.dt-modal-search {
  margin: 18px 20px 0;
  height: 58px;
  border-radius: 20px;
  border: 1px solid rgba(243, 248, 238, 0.13);
  background: rgba(243, 248, 238, 0.07);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
}

.dt-modal-search input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: #f3f8ee;
  font-weight: 850;
}

.dt-modal-search input::placeholder {
  color: rgba(243, 248, 238, 0.4);
}

.dt-asset-picker-grid {
  padding: 20px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.dt-picker-card {
  min-height: 118px;
  border: 1px solid rgba(243, 248, 238, 0.13);
  background: rgba(243, 248, 238, 0.07);
  color: #f3f8ee;
  border-radius: 24px;
  padding: 16px;
  text-align: left;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 14px;
  position: relative;
  cursor: pointer;
  transition: 0.2s ease;
}

.dt-picker-card:hover {
  transform: translateY(-2px);
  border-color: rgba(126, 255, 155, 0.3);
  background: rgba(126, 255, 155, 0.09);
}

.dt-picker-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(126, 255, 155, 0.11);
  border: 1px solid rgba(126, 255, 155, 0.16);
}

.dt-picker-card h3 {
  margin: 0 0 3px;
  font-size: 17px;
  letter-spacing: -0.02em;
}

.dt-picker-card p {
  margin: 0;
  color: rgba(243, 248, 238, 0.58);
  font-size: 12px;
  font-weight: 850;
}

.dt-picker-card span:not(.dt-status-pill) {
  display: inline-block;
  margin-top: 8px;
  color: rgba(243, 248, 238, 0.74);
  font-size: 12px;
  font-weight: 950;
}

.dt-picker-arrow {
  position: absolute;
  right: 16px;
  bottom: 16px;
  color: rgba(243, 248, 238, 0.45);
}

.dt-status-pill {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(243, 248, 238, 0.13);
  background: rgba(10, 16, 10, 0.34);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #f3f8ee;
  font-size: 11px;
  font-weight: 950;
  white-space: nowrap;
}

.dt-status-pill i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--status-color);
  box-shadow: 0 0 12px var(--status-color);
}

.dt-empty-list {
  margin: 20px;
  min-height: 340px;
  border: 1px dashed rgba(243, 248, 238, 0.18);
  border-radius: 28px;
  display: grid;
  place-items: center;
  text-align: center;
  color: rgba(243, 248, 238, 0.62);
}

.dt-empty-list h3 {
  margin: 14px 0 6px;
  color: #f3f8ee;
  font-size: 22px;
}

.dt-empty-list p {
  max-width: 390px;
  line-height: 1.55;
  font-weight: 750;
}

.dt-inspector {
  position: fixed;
  right: 28px;
  top: 128px;
  bottom: 32px;
  width: min(420px, calc(100vw - 56px));
  z-index: 50;
  border-radius: 30px;
  border: 1px solid rgba(243, 248, 238, 0.15);
  background:
    radial-gradient(circle at 20% 0%, rgba(126, 255, 155, 0.08), transparent 34%),
    rgba(18, 28, 16, 0.92);
  backdrop-filter: blur(18px);
  box-shadow: 0 35px 100px rgba(0,0,0,0.38);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dt-inspector-head {
  padding: 20px;
  display: grid;
  grid-template-columns: 58px 1fr 46px;
  gap: 14px;
  align-items: start;
  border-bottom: 1px solid rgba(243, 248, 238, 0.1);
}

.dt-inspector-icon {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: rgba(126, 255, 155, 0.12);
  border: 1px solid rgba(126, 255, 155, 0.2);
}

.dt-inspector-head span {
  color: rgba(243, 248, 238, 0.58);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.dt-inspector-head h2 {
  margin: 3px 0 8px;
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.045em;
}

.dt-inspector-scroll {
  padding: 16px;
  overflow: auto;
  flex: 1;
}

.dt-inspector-section {
  border: 1px solid rgba(243, 248, 238, 0.12);
  border-radius: 24px;
  padding: 16px;
  background: rgba(243, 248, 238, 0.055);
  margin-bottom: 14px;
}

.dt-inspector-section.danger {
  border-color: rgba(255, 125, 110, 0.28);
  background: rgba(255, 125, 110, 0.08);
}

.dt-inspector-section h3 {
  margin: 0 0 13px;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  letter-spacing: -0.015em;
}

.dt-kv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dt-kv-grid div,
.dt-link-summary div,
.dt-mini-list div,
.dt-impact-box {
  border-radius: 16px;
  background: rgba(8, 13, 8, 0.28);
  padding: 11px;
}

.dt-kv-grid span,
.dt-link-summary span,
.dt-impact-box span {
  display: block;
  color: rgba(243, 248, 238, 0.48);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.dt-kv-grid b,
.dt-link-summary b,
.dt-impact-box b {
  display: block;
  margin-top: 5px;
  color: #f3f8ee;
  font-size: 13px;
  font-weight: 950;
}

.dt-link-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  margin-bottom: 12px;
}

.dt-muted,
.dt-impact-text {
  margin: 0;
  color: rgba(243, 248, 238, 0.62);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.55;
}

.dt-mini-list {
  display: grid;
  gap: 8px;
}

.dt-mini-list div {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 8px;
  align-items: center;
}

.dt-mini-list span {
  font-size: 12px;
  font-weight: 900;
}

.dt-mini-list b {
  color: rgba(243, 248, 238, 0.55);
  font-size: 10px;
  text-transform: uppercase;
}

.dt-impact-box {
  margin-top: 12px;
}

.dt-impact-box p {
  margin: 8px 0 0;
  color: rgba(243, 248, 238, 0.68);
  font-size: 12px;
  font-weight: 800;
}

.dt-inspector-actions {
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  border-top: 1px solid rgba(243, 248, 238, 0.1);
}

.dt-inspector-actions button {
  height: 50px;
  border-radius: 17px;
  border: 1px solid rgba(243, 248, 238, 0.14);
  color: #f3f8ee;
  font-weight: 950;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.dt-danger-soft {
  background: rgba(255, 125, 110, 0.12);
  border-color: rgba(255, 125, 110, 0.25) !important;
}

.dt-remove-btn {
  background: rgba(243, 248, 238, 0.08);
}

.dt-help-panel {
  position: fixed;
  left: 30px;
  top: 128px;
  width: 370px;
  z-index: 60;
  border-radius: 28px;
  border: 1px solid rgba(243, 248, 238, 0.15);
  background: rgba(18, 28, 16, 0.94);
  backdrop-filter: blur(18px);
  box-shadow: 0 30px 90px rgba(0,0,0,0.35);
  overflow: hidden;
}

.dt-help-head {
  padding: 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(243, 248, 238, 0.1);
}

.dt-help-head span {
  color: rgba(243, 248, 238, 0.55);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.dt-help-head h3 {
  margin: 4px 0 0;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.dt-help-steps {
  padding: 16px;
  display: grid;
  gap: 10px;
}

.dt-help-steps div {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  align-items: center;
  border-radius: 16px;
  background: rgba(243, 248, 238, 0.06);
  padding: 10px;
}

.dt-help-steps b {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(126, 255, 155, 0.12);
}

.dt-help-steps p,
.dt-help-controls p {
  margin: 0;
  color: rgba(243, 248, 238, 0.68);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}

.dt-help-controls {
  padding: 0 16px 16px;
  display: grid;
  gap: 7px;
}

.dt-connection-panel {
  position: fixed;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  width: min(520px, 90vw);
  z-index: 55;
  border-radius: 24px;
  border: 1px solid rgba(243, 248, 238, 0.15);
  background: rgba(18, 28, 16, 0.92);
  backdrop-filter: blur(18px);
  box-shadow: 0 26px 70px rgba(0,0,0,0.36);
  padding: 18px;
}

.dt-connection-panel span {
  color: rgba(243, 248, 238, 0.52);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.dt-connection-panel h3 {
  margin: 5px 44px 4px 0;
  font-size: 20px;
}

.dt-connection-panel p {
  margin: 0 0 14px;
  color: rgba(243, 248, 238, 0.62);
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}

.dt-connection-panel button:not(.dt-connection-close) {
  height: 44px;
  border-radius: 15px;
  border: 1px solid rgba(255, 125, 110, 0.24);
  background: rgba(255, 125, 110, 0.12);
  color: #f3f8ee;
  font-weight: 950;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  cursor: pointer;
}

.dt-connection-close {
  position: absolute;
  right: 14px;
  top: 14px;
}

.dt-loader {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(12, 18, 11, 0.42);
  backdrop-filter: blur(5px);
  z-index: 20;
}

.dt-loader p {
  margin-top: 88px;
  color: rgba(243, 248, 238, 0.76);
  font-weight: 900;
}

.dt-loader-orb {
  position: absolute;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 4px solid rgba(243, 248, 238, 0.12);
  border-top-color: #7CFF9B;
  animation: dtSpin 0.9s linear infinite;
}

.dt-toast {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 100;
  width: min(390px, calc(100vw - 56px));
  border-radius: 22px;
  border: 1px solid rgba(243, 248, 238, 0.14);
  background: rgba(18, 28, 16, 0.94);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 70px rgba(0,0,0,0.36);
  padding: 15px;
  display: grid;
  grid-template-columns: 1fr 38px;
  gap: 12px;
}

.dt-toast.success {
  border-color: rgba(126, 255, 155, 0.28);
}

.dt-toast.error {
  border-color: rgba(255, 125, 110, 0.32);
}

.dt-toast.warning {
  border-color: rgba(255, 209, 102, 0.32);
}

.dt-toast strong {
  display: block;
  font-size: 14px;
  margin-bottom: 3px;
}

.dt-toast span {
  color: rgba(243, 248, 238, 0.64);
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.dt-toast button {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  border: 1px solid rgba(243, 248, 238, 0.12);
  background: rgba(243, 248, 238, 0.07);
  color: #f3f8ee;
  display: grid;
  place-items: center;
  cursor: pointer;
}

@keyframes dtSpin {
  to {
    transform: rotate(360deg);
  }
}

.dt-inspector-scroll::-webkit-scrollbar,
.dt-asset-picker-grid::-webkit-scrollbar {
  width: 8px;
}

.dt-inspector-scroll::-webkit-scrollbar-track,
.dt-asset-picker-grid::-webkit-scrollbar-track {
  background: rgba(243, 248, 238, 0.04);
  border-radius: 999px;
}

.dt-inspector-scroll::-webkit-scrollbar-thumb,
.dt-asset-picker-grid::-webkit-scrollbar-thumb {
  background: rgba(243, 248, 238, 0.22);
  border-radius: 999px;
}

.dt-inspector-scroll::-webkit-scrollbar-thumb:hover,
.dt-asset-picker-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(126, 255, 155, 0.36);
}

@media (max-width: 1180px) {
  .dt-hero-strip {
    grid-template-columns: 1fr;
  }

  .dt-command-bar {
    justify-content: flex-start;
  }

  .dt-workspace {
    height: calc(100vh - 330px);
  }
}

@media (max-width: 820px) {
  .dt-topbar {
    height: auto;
    padding: 16px;
    align-items: flex-start;
    gap: 14px;
    flex-direction: column;
  }

  .dt-topbar-actions {
    flex-wrap: wrap;
  }

  .dt-shell {
    padding: 0 16px 18px;
  }

  .dt-title-card {
    align-items: flex-start;
  }

  .dt-command-btn {
    flex: 1;
    justify-content: center;
  }

  .dt-workspace {
    min-height: 620px;
    height: 72vh;
    border-radius: 26px;
  }

  .dt-workspace-legend {
    display: none;
  }

  .dt-mini-guide {
    left: 14px;
    right: 14px;
    transform: none;
    max-width: none;
    border-radius: 18px;
  }

  .dt-asset-picker-grid {
    grid-template-columns: 1fr;
  }

  .dt-inspector {
    left: 14px;
    right: 14px;
    top: auto;
    bottom: 14px;
    width: auto;
    max-height: 72vh;
  }

  .dt-help-panel {
    left: 14px;
    right: 14px;
    width: auto;
  }
}
`