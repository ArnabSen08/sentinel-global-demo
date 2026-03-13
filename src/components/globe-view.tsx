"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { latLonToVector3 } from '@/lib/geo';
import type { Incident } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface GlobeViewProps {
  incidents: Incident[];
}

const GLOBE_RADIUS = 5;

export function GlobeView({ incidents }: GlobeViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const incidentsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xcccccc, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Globe
    const globeTexture = new THREE.TextureLoader().load(PlaceHolderImages[0].imageUrl);
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMaterial = new THREE.MeshStandardMaterial({
        map: globeTexture,
        color: 0xaaaaaa, // Muted color to blend with dark texture
        metalness: 0.3,
        roughness: 0.7,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Initial camera position focused on Ukraine
    const ukraineCoords = latLonToVector3(48.3794, 31.1656, GLOBE_RADIUS + 4);
    camera.position.copy(ukraineCoords);
    camera.lookAt(globe.position);
    
    // Incident container
    const incidentsGroup = new THREE.Group();
    globe.add(incidentsGroup);

    // Animation loop
    const animate = () => {
      if (!rendererRef.current) return; // Stop if disposed
      requestAnimationFrame(animate);

      globe.rotation.y += 0.0005;

      // Pulsating effect for spikes
      incidentsGroup.children.forEach(spike => {
        const scale = 1 + Math.sin(Date.now() * 0.005 + spike.position.x) * 0.1;
        spike.scale.set(1, scale, 1);
      });

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!rendererRef.current) return;
      const { clientWidth, clientHeight } = currentMount;
      rendererRef.current.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        currentMount.removeChild(renderer.domElement);
      } catch (e) {
        // ignore if already removed
      }
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      globeTexture.dispose();
      incidentsRef.current.forEach(spike => {
        if(spike instanceof THREE.Mesh) {
            spike.geometry.dispose();
            if(Array.isArray(spike.material)) {
                spike.material.forEach(m => m.dispose());
            } else {
                spike.material.dispose();
            }
        }
      });
      incidentsRef.current.clear();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const globe = scene.children.find(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry);
    const incidentsGroup = globe?.children.find(child => child instanceof THREE.Group);
    
    if (!globe || !incidentsGroup) return;

    const currentIncidentIds = new Set(incidents.map(inc => inc.id));
    
    // Remove old incidents
    incidentsRef.current.forEach((spike, id) => {
        if (!currentIncidentIds.has(id)) {
            incidentsGroup.remove(spike);
            if(spike instanceof THREE.Mesh) {
                spike.geometry.dispose();
                if(Array.isArray(spike.material)) {
                    spike.material.forEach(m => m.dispose());
                } else {
                    spike.material.dispose();
                }
            }
            incidentsRef.current.delete(id);
        }
    });

    // Add new incidents
    incidents.forEach(incident => {
      if (!incidentsRef.current.has(incident.id)) {
        const spikeHeight = 0.5 + (incident.frp || 50) / 200; // Scale height by fire radiative power
        const spikeGeometry = new THREE.CylinderGeometry(0.02, 0.02, spikeHeight, 8);
        const spikeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0033, toneMapped: false });

        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        
        const position = latLonToVector3(incident.latitude, incident.longitude, GLOBE_RADIUS);
        spike.position.copy(position);
        spike.lookAt(new THREE.Vector3(0,0,0));
        spike.rotateX(Math.PI / 2);
        
        // Adjust position to sit on globe surface
        const surfaceNormal = position.clone().normalize();
        spike.position.add(surfaceNormal.multiplyScalar(spikeHeight / 2));

        incidentsGroup.add(spike);
        incidentsRef.current.set(incident.id, spike);
      }
    });

  }, [incidents]);


  return <div ref={mountRef} className="absolute inset-0 z-0" />;
}
