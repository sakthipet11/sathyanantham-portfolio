'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Hero3DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 6;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(10, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2, 20);
    pointLight.position.set(-5, -5, -2);
    scene.add(pointLight);

    // 4. Floating 3D Polyhedron (Cyan Glass Aesthetic)
    const polyGeo = new THREE.IcosahedronGeometry(1.4, 0);
    const polyMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.15,
      transmission: 0.9,
      transparent: true,
      opacity: 0.85,
      reflectivity: 0.9,
      ior: 1.4
    });
    const polyhedron = new THREE.Mesh(polyGeo, polyMat);
    polyhedron.position.set(2.5, 0.5, -1);
    scene.add(polyhedron);

    // 5. Floating Torus Knot (Indigo/Purple Glass Aesthetic)
    const torusGeo = new THREE.TorusKnotGeometry(0.9, 0.28, 128, 32);
    const torusMat = new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.8,
      transparent: true,
      opacity: 0.75,
      reflectivity: 0.9
    });
    const torusKnot = new THREE.Mesh(torusGeo, torusMat);
    torusKnot.position.set(-2.8, -1, -2);
    scene.add(torusKnot);

    // 6. Particle Constellation Field
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 16;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.6
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    scene.add(particleField);

    // 7. Mouse Parallax Motion
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 8. Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate objects
      polyhedron.rotation.x = elapsedTime * 0.2;
      polyhedron.rotation.y = elapsedTime * 0.25;
      polyhedron.position.y = 0.5 + Math.sin(elapsedTime * 1.5) * 0.15;

      torusKnot.rotation.x = -elapsedTime * 0.15;
      torusKnot.rotation.z = elapsedTime * 0.2;
      torusKnot.position.y = -1 + Math.cos(elapsedTime * 1.2) * 0.15;

      particleField.rotation.y = elapsedTime * 0.03;

      // Parallax smooth interpolation
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    // 10. Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      polyGeo.dispose();
      polyMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-85 overflow-hidden"
    />
  );
}
