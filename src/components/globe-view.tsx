
"use client";
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Vector3, CylinderGeometry, MeshBasicMaterial, DoubleSide, SphereGeometry, LineBasicMaterial, BufferGeometry, BackSide, AdditiveBlending } from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Earthquake, EonetEvent, Ship, Flight, IssPosition, WeatherUpdate } from '@/types';
import * as turf from '@turf/turf';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Button } from './ui/button';
import { Map } from 'lucide-react';

// Helper function to convert lat/lon to a 3D vector
const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new Vector3(x, y, z);
};

// Helper function to convert a 3D vector on sphere back to lat/lon
const vector3ToLatLon = (vector: Vector3, radius: number) => {
    const { x, y, z } = vector;
    const lat = 90 - (Math.acos(y / radius)) * 180 / Math.PI;
    const lon = ((Math.atan2(z, -x)) * 180 / Math.PI) - 180;
    return { lat, lon };
};

function Earth({ onPointerMove, onPointerOut, onClick }: { 
    onPointerMove: (e: any) => void;
    onPointerOut: (e: any) => void;
    onClick: (e: any) => void;
}) {
    return (
        <mesh 
            onPointerMove={onPointerMove}
            onPointerOut={onPointerOut}
            onClick={onClick}
        >
            <sphereGeometry args={[5, 64, 64]} />
            <meshBasicMaterial color="#000011" transparent opacity={0.8} />
        </mesh>
    );
}

function Countries({ data, hoveredCountry }: { data: any; hoveredCountry: string | null }) {
    const { lines, hoveredLines } = useMemo(() => {
        if (!data || !data.features) return { lines: [], hoveredLines: [] };
        
        const allLines: { id: string; geometry: BufferGeometry }[] = [];
        const allHoveredLines: { id: string; geometry: BufferGeometry }[] = [];

        data.features.forEach((feat: any) => {
            const { type } = feat.geometry;
            const coords = feat.geometry.coordinates;
            const id = feat.properties.ISO_A3;
            const targetArray = id === hoveredCountry ? allHoveredLines : allLines;

            const processPolygon = (poly: any) => {
                const points = poly.map((p: number[]) => latLonToVector3(p[1], p[0], 5.002));
                const geometry = new BufferGeometry().setFromPoints(points);
                targetArray.push({ id: `${id}-${targetArray.length}`, geometry });
            };

            if (type === 'Polygon') {
                coords.forEach(processPolygon);
            } else if (type === 'MultiPolygon') {
                coords.forEach((multiPoly: any) => {
                    multiPoly.forEach(processPolygon);
                });
            }
        });
        return { lines: allLines, hoveredLines: allHoveredLines };
    }, [data, hoveredCountry]);

    const material = useMemo(() => new LineBasicMaterial({ color: '#888', toneMapped: false }), []);
    const hoveredMaterial = useMemo(() => new LineBasicMaterial({ color: 'hsl(var(--primary))', toneMapped: false }), []);

    return (
        <group>
            {lines.map(line => (
                <line key={line.id} geometry={line.geometry} material={material} />
            ))}
            {hoveredLines.map(line => (
                <line key={line.id} geometry={line.geometry} material={hoveredMaterial} />
            ))}
        </group>
    );
}


function Atmosphere() {
    return (
         <mesh scale={[1.04, 1.04, 1.04]}>
            <sphereGeometry args={[5, 64, 64]} />
            <meshBasicMaterial 
              color="hsl(var(--primary))" 
              transparent 
              opacity={0.1} 
              side={BackSide} 
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
        </mesh>
    );
}

function Incidents({ data }: { data: (Incident | EonetEvent)[] }) {
    const incidentMaterial = useMemo(() => new MeshBasicMaterial({ color: 'hsl(var(--primary))', toneMapped: false }), []);

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
            isMajor: q.magnitude > 5.0,
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
        
        const updatedQuakes = activeQuakes.map(q => ({
            ...q, 
            life: q.life - delta * (q.isMajor ? 0.3 : 0.2) // Faster fade for major quakes
        })).filter(q => q.life > 0);

        setActiveQuakes(updatedQuakes);
    });

    return (
        <group>
            {activeQuakes.map(quake => {
                const isMajor = quake.isMajor;
                const scale = 1 - quake.life; // 0 to 1
                
                const innerRadius = isMajor ? 0.05 + (quake.magnitude * 0.1) * scale : 0.05 + (quake.magnitude * 0.05) * scale;
                const outerRadius = isMajor ? 0.1 + (quake.magnitude * 0.15) * scale : 0.1 + (quake.magnitude * 0.05) * scale;
                
                const opacity = isMajor ? Math.sin(quake.life * Math.PI) * 0.9 : quake.life * 0.7;

                return (
                    <mesh key={quake.id} position={quake.pos} lookAt={new Vector3(0,0,0)}>
                        <ringGeometry args={[
                            innerRadius,
                            outerRadius,
                            32
                        ]} />
                        <meshBasicMaterial
                            color={isMajor ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                            transparent
                            opacity={opacity}
                            side={DoubleSide}
                            toneMapped={false}
                        />
                    </mesh>
                );
            })}
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

function ISS({ position }: { position: IssPosition }) {
    // Earth's radius in the model is 5. Earth's actual radius is ~6371km.
    const issAltitudeScale = position.altitude / 6371;
    const issRadius = 5 * (1 + issAltitudeScale);
    
    const issPositionVector = latLonToVector3(position.latitude, position.longitude, issRadius);

    const issMaterial = useMemo(() => new MeshBasicMaterial({ color: '#FFFF00', toneMapped: false }), []);
    const issGeometry = useMemo(() => new SphereGeometry(0.05, 16, 16), []);

    return (
        <mesh position={issPositionVector} geometry={issGeometry} material={issMaterial} />
    );
}

function GlobeScene({ allIncidents, earthquakes, ships, flights, countries, issPosition, hoveredCountry, onPointerMove, onPointerOut, onClick }: {
    allIncidents: (Incident | EonetEvent)[];
    earthquakes: Earthquake[];
    ships: Ship[];
    flights: Flight[];
    countries: any;
    issPosition: IssPosition | null;
    hoveredCountry: string | null;
    onPointerMove: (e: any) => void;
    onPointerOut: (e: any) => void;
    onClick: (e: any) => void;
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
                <Earth onPointerMove={onPointerMove} onPointerOut={onPointerOut} onClick={onClick} />
                <Atmosphere />
                <Countries data={countries} hoveredCountry={hoveredCountry} />
                <Incidents data={allIncidents} />
                <Earthquakes data={earthquakes} />
                <Ships data={ships} />
                <Flights data={flights} />
                {issPosition && <ISS position={issPosition} />}
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
                <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={0.8} />
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
    const [weather, setWeather] = useState<WeatherUpdate[]>([]);
    const [countries, setCountries] = useState({ features: [] });
    const [issPosition, setIssPosition] = useState<IssPosition | null>(null);
    const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
    const { toast } = useToast();


    useEffect(() => {
        const listeners = [
            onSnapshot(query(collection(firestore, 'incidents'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => 
                setIncidents(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Incident[])),
            onSnapshot(query(collection(firestore, 'earthquakes'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => 
                setEarthquakes(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Earthquake[])),
            onSnapshot(query(collection(firestore, 'eonet_events'), orderBy('timestamp', 'desc'), limit(200)), (snapshot) => 
                setEonetEvents(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as EonetEvent[])),
            onSnapshot(query(collection(firestore, 'ships'), orderBy('timestamp', 'desc'), limit(1000)), (snapshot) => 
                setShips(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Ship[])),
            onSnapshot(query(collection(firestore, 'flights'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => 
                setFlights(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Flight[])),
            onSnapshot(query(collection(firestore, 'weather'), limit(50)), (snapshot) => 
                setWeather(snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as WeatherUpdate[])),
        ];

        async function fetchIssPosition() {
            try {
                const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
                if (response.ok) {
                    const data = await response.json();
                    setIssPosition(data as IssPosition);
                }
            } catch (error) {
                console.error("Error fetching ISS position:", error);
            }
        }

        fetchIssPosition();
        const issInterval = setInterval(fetchIssPosition, 5000);

        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(setCountries)
            .catch(err => console.error("Error fetching country data:", err));
        
        return () => {
            listeners.forEach(unsubscribe => unsubscribe());
            clearInterval(issInterval);
        };
    }, []);
    
    const findCountry = useCallback((point3d: Vector3): any | null => {
        if (!countries.features.length) return null;
        const { lat, lon } = vector3ToLatLon(point3d, 5);
        const clickedPoint = turf.point([lon, lat]);

        for (const feature of countries.features) {
            let isInside = false;
            if (feature.geometry.type === 'Polygon') {
                isInside = turf.booleanPointInPolygon(clickedPoint, feature.geometry);
            } else if (feature.geometry.type === 'MultiPolygon') {
                for (const polygonCoords of feature.geometry.coordinates) {
                    const poly = turf.polygon(polygonCoords);
                    if (turf.booleanPointInPolygon(clickedPoint, poly)) {
                        isInside = true;
                        break;
                    }
                }
            }
            
            if (isInside) {
                return feature;
            }
        }
        return null;
    }, [countries]);

    const handlePointerMove = useCallback((e: any) => {
        e.stopPropagation();
        const country = findCountry(e.point);
        const countryId = country ? country.properties.ISO_A3 : null;
        if (countryId !== hoveredCountry) {
            setHoveredCountry(countryId);
        }
    }, [findCountry, hoveredCountry]);
    
    const handlePointerOut = useCallback(() => {
        setHoveredCountry(null);
    }, []);

    const handleClick = useCallback((e: any) => {
        e.stopPropagation();
        const country = findCountry(e.point);
        if (country) {
            toast({
                title: `Country: ${country.properties.NAME}`,
                description: `Region: ${country.properties.SUBREGION}`,
            });
        }
    }, [findCountry, toast]);


    const allIncidents = useMemo(() => [...incidents, ...eonetEvents], [incidents, eonetEvents]);


    return (
        <div className="w-full h-screen relative bg-black">
            <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
                <GlobeScene 
                    allIncidents={allIncidents}
                    earthquakes={earthquakes}
                    ships={ships}
                    flights={flights}
                    countries={countries}
                    issPosition={issPosition}
                    hoveredCountry={hoveredCountry}
                    onPointerMove={handlePointerMove}
                    onPointerOut={handlePointerOut}
                    onClick={handleClick}
                />
            </Canvas>
            <div className="absolute top-4 left-4 z-10">
                <Link href="/" passHref>
                    <Button variant="outline">
                        <Map className="mr-2 h-4 w-4" />
                        2D Map View
                    </Button>
                </Link>
            </div>
            <div className="absolute top-4 right-4 p-4 rounded-lg bg-black/50 text-white font-mono text-sm">
                <h3 className="font-bold text-primary mb-2">Global Stats</h3>
                <p>Fires/Events: {allIncidents.length}</p>
                <p>Earthquakes: {earthquakes.length}</p>
                <p>Active Ships: {ships.length}</p>
                <p>Active Flights: {flights.length}</p>
                <p>Weather Points: {weather.length}</p>
                {issPosition && <p className="text-yellow-400 mt-2">ISS Altitude: {issPosition.altitude.toFixed(0)} km</p>}
            </div>
             <div className="absolute bottom-4 left-4 p-2 rounded-lg bg-black/50 text-white font-mono text-xs">
                <p>3D Globe View | SENTINEL</p>
            </div>
        </div>
    );
}
