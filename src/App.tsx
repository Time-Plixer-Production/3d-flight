import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  useTexture,
  Html,
  Line,
} from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import "./index.css";

// ── City Database ─────────────────────────────────────────────────────────────-
const CITIES: Record<string, [number, number]> = {
  "london": [51.5074, -0.1278],
  "new york": [40.7128, -74.006],
  "paris": [48.8566, 2.3522],
  "tokyo": [35.6762, 139.6503],
  "sydney": [-33.8688, 151.2093],
  "dubai": [25.2048, 55.2708],
  "los angeles": [34.0522, -118.2437],
  "singapore": [1.3521, 103.8198],
  "moscow": [55.7558, 37.6173],
  "beijing": [39.9042, 116.4074],
  "mumbai": [19.076, 72.8777],
  "cairo": [30.0444, 31.2357],
  "rio de janeiro": [-22.9068, -43.1729],
  "toronto": [43.6532, -79.3832],
  "berlin": [52.52, 13.405],
  "cape town": [-33.9249, 18.4241],
  "bangkok": [13.7563, 100.5018],
  "rome": [41.9028, 12.4964],
  "amsterdam": [52.3676, 4.9041],
  "madrid": [40.4168, -3.7038],
  "istanbul": [41.0082, 28.9784],
  "seoul": [37.5665, 126.978],
  "mexico city": [19.4326, -99.1332],
  "buenos aires": [-34.6037, -58.3816],
  "johannesburg": [-26.2041, 28.0473],
  "hatfield": [51.7626, -0.2224],
  "chicago": [41.8781, -87.6298],
  "miami": [25.7617, -80.1918],
  "san francisco": [37.7749, -122.4194],
  "lagos": [6.5244, 3.3792],
  "nairobi": [-1.2921, 36.8219],
  "karachi": [24.8607, 67.0011],
  "dhaka": [23.8103, 90.4125],
  "lima": [-12.0464, -77.0428],
  "bogota": [4.711, -74.0721],
  "santiago": [-33.4489, -70.6693],
  "casablanca": [33.5731, -7.5898],
  "accra": [5.6037, -0.187],
  "vienna": [48.2082, 16.3738],
  "zurich": [47.3769, 8.5417],
  "brussels": [50.8503, 4.3517],
  "stockholm": [59.3293, 18.0686],
  "oslo": [59.9139, 10.7522],
  "copenhagen": [55.6761, 12.5683],
  "helsinki": [60.1699, 24.9384],
  "athens": [37.9838, 23.7275],
  "lisbon": [38.7223, -9.1393],
  "prague": [50.0755, 14.4378],
  "warsaw": [52.2297, 21.0122],
  "budapest": [47.4979, 19.0402],
  "bucharest": [44.4268, 26.1025],
  "kyiv": [50.4501, 30.5234],
  "riyadh": [24.7136, 46.6753],
  "tehran": [35.6892, 51.389],
  "baghdad": [33.3152, 44.3661],
  "islamabad": [33.6844, 73.0479],
  "colombo": [6.9271, 79.8612],
  "kathmandu": [27.7172, 85.314],
  "yangon": [16.8661, 96.1951],
  "manila": [14.5995, 120.9842],
  "jakarta": [-6.2088, 106.8456],
  "kuala lumpur": [3.139, 101.6869],
  "ho chi minh city": [10.8231, 106.6297],
  "taipei": [25.033, 121.5654],
  "hong kong": [22.3193, 114.1694],
  "osaka": [34.6937, 135.5023],
  "auckland": [-36.8485, 174.7633],
  "melbourne": [-37.8136, 144.9631],
  "perth": [-31.9505, 115.8605],
  "denver": [39.7392, -104.9903],
  "seattle": [47.6062, -122.3321],
  "boston": [42.3601, -71.0589],
  "washington dc": [38.9072, -77.0369],
  "atlanta": [33.749, -84.388],
  "dallas": [32.7767, -96.797],
  "houston": [29.7604, -95.3698],
  "phoenix": [33.4484, -112.074],
  "montreal": [45.5017, -73.5673],
  "vancouver": [49.2827, -123.1207],
  "havana": [23.1136, -82.3666],
  "panama city": [8.9936, -79.5197],
  "san jose": [9.9281, -84.0907],
  "quito": [-0.1807, -78.4678],
  "la paz": [-16.5, -68.15],
  "asuncion": [-25.2867, -57.647],
  "montevideo": [-34.9011, -56.1645],
};

function geocodeCity(name: string): [number, number] | null {
  return CITIES[name.toLowerCase().trim()] ?? null;
}

// ── Math helpers ──────────────────────────────────────────────────────────────
function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function buildArc(
  from: [number, number],
  to: [number, number],
  r = 1,
  segments = 120,
  height = 0.38
): THREE.Vector3[] {
  const a = latLngToVec3(from[0], from[1], r);
  const b = latLngToVec3(to[0], to[1], r);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const v = new THREE.Vector3().lerpVectors(a, b, t);
    v.normalize().multiplyScalar(r + Math.sin(Math.PI * t) * height);
    return v;
  });
}

// ── Components ────────────────────────────────────────────────────────────────
function Earth() {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [day, night, clouds, specular, bump] = useTexture([
    "https://unpkg.com/three-globe/example/img/earth-day.jpg",
    "https://unpkg.com/three-globe/example/img/earth-night.jpg",
    "https://unpkg.com/three-globe/example/img/earth-clouds.png",
    "https://unpkg.com/three-globe/example/img/earth-water.png",
    "https://unpkg.com/three-globe/example/img/earth-topology.png",
  ]);

  useFrame(() => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00025;
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 128, 128]} />
        <meshPhongMaterial
          map={day}
          emissiveMap={night}
          emissive={new THREE.Color(0x112244)}
          emissiveIntensity={1.0}
          specularMap={specular}
          specular={new THREE.Color(0x4488aa)}
          shininess={30}
          bumpMap={bump}
          bumpScale={0.05}
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.007, 64, 64]} />
        <meshPhongMaterial
          map={clouds}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.05, 64, 64]} />
        <meshPhongMaterial
          color={new THREE.Color(0x1188ff)}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

function CityPin({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = latLngToVec3(lat, lng, 1.012);

  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
      ref.current.scale.setScalar(s);
    }
  });

  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.013, 16, 16]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff2200"
          emissiveIntensity={3}
        />
      </mesh>
      <Html center distanceFactor={4} zIndexRange={[10, 0]}>
        <div className="city-label">{label}</div>
      </Html>
    </group>
  );
}

function Plane({ arc, onDone }: { arc: THREE.Vector3[]; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const prog = useRef({ t: 0 });

  useEffect(() => {
    prog.current.t = 0;
    gsap.to(prog.current, {
      t: 1,
      duration: 7,
      ease: "power1.inOut",
      onComplete: onDone,
    });
  }, [arc, onDone]);

  useFrame(() => {
    if (!ref.current || arc.length < 2) return;
    const idx = Math.min(
      Math.floor(prog.current.t * (arc.length - 1)),
      arc.length - 2
    );
    ref.current.position.copy(arc[idx]);
    ref.current.lookAt(arc[idx + 1]);
  });

  return (
    <mesh ref={ref}>
      <coneGeometry args={[0.013, 0.055, 8]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#88ccff"
        emissiveIntensity={2.5}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
}

function CameraFly({ to }: { to: THREE.Vector3 | null }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!to) return;
    const dest = to.clone().multiplyScalar(2.6);
    gsap.to(camera.position, {
      x: dest.x,
      y: dest.y,
      z: dest.z,
      duration: 2.8,
      ease: "power2.inOut",
    });
  }, [to, camera]);
  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({
  origin,
  dest,
  flying,
  onDone,
}: {
  origin: [number, number] | null;
  dest: [number, number] | null;
  flying: boolean;
  onDone: () => void;
}) {
  const arc = origin && dest ? buildArc(origin, dest) : [];
  const mid = arc.length ? arc[Math.floor(arc.length / 2)] : null;

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.5}
        color="#fff5e0"
      />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#002244" />
      <Stars
        radius={300}
        depth={60}
        count={10000}
        factor={5}
        saturation={0}
        fade
        speed={0.8}
      />
      <Suspense fallback={null}>
        <Earth />
        {origin && (
          <CityPin lat={origin[0]} lng={origin[1]} label="🛫 Origin" />
        )}
        {dest && (
          <CityPin lat={dest[0]} lng={dest[1]} label="🛬 Destination" />
        )}
        {arc.length > 0 && (
          <Line
            points={arc}
            color="#00cfff"
            lineWidth={1.8}
            dashed
            dashSize={0.03}
            gapSize={0.015}
          />
        )}
        {flying && arc.length > 0 && <Plane arc={arc} onDone={onDone} />}
      </Suspense>
      <CameraFly to={flying ? mid : null} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          intensity={0.7}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0004, 0.0004)}
          radialModulation={false}
          modulationOffset={0.15}
        />
      </EffectComposer>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [dest, setDest] = useState<[number, number] | null>(null);
  const [flying, setFlying] = useState(false);
  const [status, setStatus] = useState(
    "Enter two cities and launch your flight ✈️"
  );
  const [err, setErr] = useState("");

  const launch = () => {
    const o = geocodeCity(from);
    const d = geocodeCity(to);
    if (!o) {
      setErr(
        `❌ "${from}" not found — check spelling or try another city`
      );
      return;
    }
    if (!d) {
      setErr(
        `❌ "${to}" not found — check spelling or try another city`
      );
      return;
    }
    setErr("");
    setOrigin(o);
    setDest(d);
    setFlying(true);
    setStatus(`✈️ Flying ${from.trim()} → ${to.trim()}…`);
  };

  return (
    <div className="app">
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
                    preserveDrawingBuffer: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <Scene
          origin={origin}
          dest={dest}
          flying={flying}
          onDone={() => {
            setFlying(false);
            setStatus(`✅ Arrived at ${to.trim()}! Drag to explore.`);
          }}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.07}
          minDistance={1.3}
          maxDistance={6}
          rotateSpeed={0.45}
          autoRotate={!flying}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <div className="panel">
        <div className="panel-title">🌍 Earth Flight Navigator</div>
        <div className="panel-subtitle">
          React Three Fiber · Three.js · GSAP
        </div>

        <div className="input-group">
          <label>Origin City</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !flying && launch()}
            placeholder="e.g. London"
            disabled={flying}
          />
        </div>

        <div className="input-group">
          <label>Destination City</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !flying && launch()}
            placeholder="e.g. Tokyo"
            disabled={flying}
          />
        </div>

        {err && <div className="error">{err}</div>}

        <button className="fly-btn" onClick={launch} disabled={flying}>
          {flying ? "✈️ In Flight…" : "🚀 Launch Flight"}
        </button>

        <div className="status">{status}</div>

        <div className="cities-hint">
          <strong>80+ cities available:</strong> London, New York, Tokyo,
          Paris, Dubai, Sydney, Singapore, Mumbai, Cairo, Berlin, Rome,
          Seoul, Bangkok, Istanbul, Toronto, Miami, Chicago, San
          Francisco, Johannesburg, Hatfield, Vienna, Stockholm, Athens,
          Nairobi, Lagos, Karachi, Manila, Jakarta, Ho Chi Minh City,
          Hong Kong, Taipei, Osaka, Melbourne, Auckland, Denver, Seattle,
          Boston, Washington DC, Vancouver, Montreal + many more…
        </div>
      </div>
    </div>
  );
}
