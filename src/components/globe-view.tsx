"use client";
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { TextureLoader, Vector3, CylinderGeometry, MeshBasicMaterial, DoubleSide, SphereGeometry, Color, MeshPhongMaterial } from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Earthquake, EonetEvent, Ship, Flight } from '@/types';

// Helper function to convert lat/lon to a 3D vector
const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new Vector3(x, y, z);
};

function Earth() {
    const [colorMap, normalMap, specularMap, emissiveMap] = useLoader(TextureLoader, [
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        'https://unpkg.com/three-globe/example/img/earth-topology.png',
        'https://unpkg.com/three-globe/example/img/earth-specular.png',
        'https://unpkg.com/three-globe/example/img/earth-night.jpg'
    ]);

    return (
        <mesh>
            <sphereGeometry args={[5, 64, 64]} />
            <MeshPhongMaterial
                map={colorMap}
                normalMap={normalMap}
                specularMap={specularMap}
                shininess={10}
                emissiveMap={emissiveMap}
                emissive={new Color(0xffffff)}
                emissiveIntensity={1.2}
            />
        </mesh>
    );
}

function Atmosphere() {
    return (
         <mesh scale={[1.04, 1.04, 1.04]}>
            <sphereGeometry args={[5, 64, 64]} />
            <meshBasicMaterial 
              color="#73DDFF" 
              transparent 
              opacity={0.1} 
              side={DoubleSide} 
              toneMapped={false}
            />
        </mesh>
    );
}

function Incidents({ data }: { data: (Incident | EonetEvent)[] }) {
    const incidentMaterial = useMemo(() => new MeshBasicMaterial({ color: '#ff4000', toneMapped: false }), []);

    const incidents = useMemo(() => data.map(d => {
        const pos = latLonToVector3(d.latitude, d.longitude, 5);
        const height = 0.1 + ((d as Incident).frp || 10) / 500;
        const geometry = new CylinderGeometry(0.02, 0.02, height, 8);
        geometry.translate(0, height / 2, 0);
        return { pos, geometry };
    }), [data]);

    return (
        <group>
            {incidents.map((incident, i) => (
                <mesh key={i} position={incident.pos} geometry={incident.geometry} material={incidentMaterial} lookAt={new Vector3(0,0,0)} />
            ))}
        </group>
    );
}


function Earthquakes({ data }: { data: Earthquake[] }) {
    const [activeQuakes, setActiveQuakes] = useState<any[]>([]);

    useEffect(() => {
        const newQuakes = data.map(q => ({
            id: q.id,
            pos: latLonToVector3(q.latitude, q.longitude, 5.02),
            magnitude: q.magnitude,
            life: 1.0, // Lifespan of the animation
        }));
        // Avoid adding duplicates
        setActiveQuakes(prev => {
            const existingIds = new Set(prev.map(q => q.id));
            const filteredNew = newQuakes.filter(q => !existingIds.has(q.id));
            return [...prev, ...filteredNew];
        });
    }, [data]);

    useFrame((_, delta) => {
        if (!activeQuakes.length) return;
        
        const updatedQuakes = activeQuakes.map(q => ({...q, life: q.life - delta * 0.2})).filter(q => q.life > 0);
        setActiveQuakes(updatedQuakes);
    });

    return (
        <group>
            {activeQuakes.map(quake => (
                <mesh key={quake.id} position={quake.pos} lookAt={new Vector3(0,0,0)}>
                    <ringGeometry args={[
                        0.05 + (quake.magnitude * 0.05) * (1 - quake.life),
                        0.1 + (quake.magnitude * 0.05) * (1 - quake.life),
                        32
                    ]} />
                    <meshBasicMaterial
                        color="red"
                        transparent
                        opacity={quake.life}
                        side={DoubleSide}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
}

function Ships({ data }: { data: Ship[] }) {
    const shipMaterial = useMemo(() => new MeshBasicMaterial({ color: "cyan", toneMapped: false }), []);
    const shipGeometry = useMemo(() => new SphereGeometry(0.02, 8, 8), []);

    const ships = useMemo(() => data.map(d => ({
        pos: latLonToVector3(d.latitude, d.longitude, 5.01),
    })), [data]);

    return (
        <group>
            {ships.map((ship, i) => (
                <mesh key={i} position={ship.pos} geometry={shipGeometry} material={shipMaterial} />
            ))}
        </group>
    );
}

function Flights({ data }: { data: Flight[] }) {
    const flightMaterial = useMemo(() => new MeshBasicMaterial({ color: "white", toneMapped: false }), []);
    const flightGeometry = useMemo(() => new SphereGeometry(0.015, 8, 8), []);
    
    const flights = useMemo(() => data
        .filter(f => f.latitude && f.longitude)
        .map(d => ({
            pos: latLonToVector3(d.latitude, d.longitude, 5.1),
        })
    ), [data]);

    return (
        <group>
            {flights.map((flight, i) => (
                <mesh key={i} position={flight.pos} geometry={flightGeometry} material={flightMaterial}/>
            ))}
        </group>
    );
}

function GlobeScene({ allIncidents, earthquakes, ships, allFlights }: {
    allIncidents: (Incident | EonetEvent)[];
    earthquakes: Earthquake[];
    ships: Ship[];
    allFlights: Flight[];
}) {
    const controlsRef = useRef<any>();
    const [isUserInteracting, setIsUserInteracting] = useState(false);

    useFrame(({ clock }) => {
        if (!isUserInteracting && controlsRef.current) {
            controlsRef.current.object.position.x = 15 * Math.sin(clock.getElapsedTime() * 0.1);
            controlsRef.current.object.position.z = 15 * Math.cos(clock.getElapsedTime() * 0.1);
            controlsRef.current.update();
        }
    });

    return (
        <>
            <ambientLight intensity={0.1} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade />

            <React.Suspense fallback={null}>
                <Earth />
                <Atmosphere />
                <Incidents data={allIncidents} />
                <Earthquakes data={earthquakes} />
                <Ships data={ships} />
                <Flights data={allFlights} />
            </React.Suspense>
            
            <OrbitControls
                ref={controlsRef}
                enablePan={false}
                enableZoom={true}
                minDistance={6}
                maxDistance={25}
                onStart={() => setIsUserInteracting(true)}
                onEnd={() => {
                   const timeout = setTimeout(() => setIsUserInteracting(false), 2000);
                   return () => clearTimeout(timeout);
                }}
            />
             <EffectComposer>
                <Bloom luminanceThreshold={0.05} luminanceSmoothing={0.9} height={300} intensity={1.2} />
            </EffectComposer>
        </>
    );
}


export default function GlobeView() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
    const [eonetEvents, setEonetEvents] = useState<EonetEvent[]>([]);
    const [ships, setShips] = useState<Ship[]>([]);
    const [flights, setFlights] = useState<Flight[]>([]);
    const [aviationStackFlights, setAviationStackFlights] = useState<Flight[]>([]);

    useEffect(() => {
        const listeners = [
            onSnapshot(query(collection(firestore, 'incidents'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => 
                setIncidents(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Incident[])),
            onSnapshot(query(collection(firestore, 'earthquakes'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => 
                setEarthquakes(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Earthquake[])),
            onSnapshot(query(collection(firestore, 'eonet_events'), orderBy('timestamp', 'desc'), limit(200)), (snapshot) => 
                setEonetEvents(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as EonetEvent[])),
            onSnapshot(query(collection(firestore, 'ships'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => 
                setShips(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Ship[])),
        ];

        async function fetchFlights() {
            const apiKey = process.env.NEXT_PUBLIC_AVIATIONSTACK_API_KEY;
            if (!apiKey) return;
            try {
                const url = `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_status=active`;
                const response = await fetch(url);
                const data = await response.json();
                if (response.ok && data.data) {
                     const allFlights = data.data
                        .filter((flight: any) => flight.live && flight.live.latitude && flight.live.longitude)
                        .map((flight: any): Flight => ({
                          id: flight.flight.iata || `${flight.departure.iata}-${flight.arrival.iata}-${flight.airline.iata}`,
                          latitude: flight.live.latitude,
                          longitude: flight.live.longitude,
                          direction: flight.live.direction,
                          flight_iata: flight.flight.iata,
                          airline_name: flight.airline.name,
                          dep_iata: flight.departure.iata,
                          arr_iata: flight.arrival.iata,
                        }));
                    setAviationStackFlights(allFlights);
                }
            } catch (error) {
                console.error("Error fetching flight data:", error);
            }
        }

        fetchFlights();
        
        return () => listeners.forEach(unsubscribe => unsubscribe());
    }, []);
    
    const allIncidents = useMemo(() => [...incidents, ...eonetEvents], [incidents, eonetEvents]);
    const allFlights = useMemo(() => [...flights, ...aviationStackFlights], [flights, aviationStackFlights]);


    return (
        <div className="w-full h-screen relative bg-black">
            <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
                <GlobeScene 
                    allIncidents={allIncidents}
                    earthquakes={earthquakes}
                    ships={ships}
                    allFlights={allFlights}
                />
            </Canvas>
            <div className="absolute top-4 right-4 p-4 rounded-lg bg-black/50 text-white font-mono text-sm">
                <h3 className="font-bold text-primary mb-2">Global Stats</h3>
                <p>Fires/Events: {allIncidents.length}</p>
                <p>Earthquakes: {earthquakes.length}</p>
                <p>Active Ships: {ships.length}</p>
                <p>Active Flights: {allFlights.length}</p>
            </div>
             <div className="absolute bottom-4 left-4 p-2 rounded-lg bg-black/50 text-white font-mono text-xs">
                <p>3D Globe View | SENTINEL</p>
            </div>
        </div>
    );
}
