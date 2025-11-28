import React, { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, FullscreenControl, ScaleControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wind, MapPin, AlertTriangle, RefreshCw, Truck, Box, Clock, CheckCircle, XCircle, Navigation } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { io, Socket } from 'socket.io-client';

// Types
interface Vehicle {
    _id: string;
    name: string;
    type: 'TANKER' | 'VAN' | 'DRONE';
    status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';
    location: { latitude: number; longitude: number };
    vendorId?: string | { _id: string, location: { latitude: number, longitude: number } };
}

interface Vendor {
    _id: string;
    name: string;
    location: { latitude: number; longitude: number };
}

interface Job {
    _id: string;
    type: string;
    status: string;
    priority: string;
    vehicleId?: Vehicle;
    hospitalId: string;
    eta?: string;
    logs: any[];
}

// Helper to generate a curved line (Quadratic Bezier)
const getCurvedLine = (start: { lng: number, lat: number }, end: { lng: number, lat: number }) => {
    const points = [];
    const steps = 50;

    // Control point (midpoint + offset for curve)
    const midLng = (start.lng + end.lng) / 2;
    const midLat = (start.lat + end.lat) / 2;
    // Add some perpendicular offset based on distance
    const dist = Math.sqrt(Math.pow(end.lng - start.lng, 2) + Math.pow(end.lat - start.lat, 2));
    const offset = dist * 0.2; // 20% curve

    const control = {
        lng: midLng - (end.lat - start.lat) * 0.2, // Perpendicular-ish
        lat: midLat + (end.lng - start.lng) * 0.2
    };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const lng = Math.pow(1 - t, 2) * start.lng + 2 * (1 - t) * t * control.lng + Math.pow(t, 2) * end.lng;
        const lat = Math.pow(1 - t, 2) * start.lat + 2 * (1 - t) * t * control.lat + Math.pow(t, 2) * end.lat;
        points.push([lng, lat]);
    }
    return points;
};

// Helper for smooth animation
const AnimatedMarker = ({ longitude, latitude, children }: { longitude: number, latitude: number, children: React.ReactNode }) => {
    const [pos, setPos] = useState({ longitude, latitude });
    const requestRef = useRef<number>();
    const targetRef = useRef({ longitude, latitude });

    useEffect(() => {
        targetRef.current = { longitude, latitude };
    }, [longitude, latitude]);

    useEffect(() => {
        const animate = () => {
            setPos(prev => {
                const lngDiff = targetRef.current.longitude - prev.longitude;
                const latDiff = targetRef.current.latitude - prev.latitude;

                // Stop if close enough to avoid jitter
                if (Math.abs(lngDiff) < 0.000001 && Math.abs(latDiff) < 0.000001) {
                    return prev;
                }

                // Simple easing (LERP)
                return {
                    longitude: prev.longitude + lngDiff * 0.1,
                    latitude: prev.latitude + latDiff * 0.1
                };
            });
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <Marker longitude={pos.longitude} latitude={pos.latitude} anchor="center">
            {children}
        </Marker>
    );
};

const Maps = () => {
    const [popupInfo, setPopupInfo] = useState<any>(null);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vehiclePaths, setVehiclePaths] = useState<Record<string, [number, number][]>>({});
    const [jobRoutes, setJobRoutes] = useState<Record<string, any>>({}); // Store GeoJSON routes
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: 72.8777,
        latitude: 19.0760,
        zoom: 11
    });

    const socketRef = useRef<Socket | null>(null);

    // Fetch initial data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [hRes, vRes, jRes, venRes] = await Promise.all([
                fetch('http://localhost:5001/api/hospitals'),
                fetch('http://localhost:5001/api/vehicles'),
                fetch('http://localhost:5001/api/jobs'),
                fetch('http://localhost:5001/api/vendors')
            ]);

            setHospitals(await hRes.json());
            setVehicles(await vRes.json());
            setJobs(await jRes.json());
            setVendors(await venRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Socket connection
        socketRef.current = io('http://localhost:5001');

        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        socketRef.current.on('vehicle_update', (data: { vehicleId: string, location: any }) => {
            setVehicles(prev => prev.map(v =>
                v._id === data.vehicleId ? { ...v, location: data.location } : v
            ));

            setVehiclePaths(prev => {
                const currentPath = prev[data.vehicleId] || [];
                // Only add if location changed significantly to avoid duplicate points
                const lastPoint = currentPath[currentPath.length - 1];
                if (lastPoint && lastPoint[0] === data.location.longitude && lastPoint[1] === data.location.latitude) {
                    return prev;
                }
                return {
                    ...prev,
                    [data.vehicleId]: [...currentPath, [data.location.longitude, data.location.latitude]]
                };
            });
        });

        socketRef.current.on('job_update', async (updatedJob: Job) => {
            setJobs(prev => {
                const exists = prev.find(j => j._id === updatedJob._id);
                if (exists) {
                    return prev.map(j => j._id === updatedJob._id ? updatedJob : j);
                }
                return [updatedJob, ...prev];
            });

            // Return to base logic
            if (updatedJob.status === 'DELIVERED' && updatedJob.vehicleId) {
                // We need to find the vehicle and its vendor
                // Since state might be stale, we fetch fresh vehicle data or use what we have if we trust it
                // Let's fetch the vehicle to get its vendorId
                try {
                    const vRes = await fetch('http://localhost:5001/api/vehicles');
                    const freshVehicles: Vehicle[] = await vRes.json();
                    const vehicle = freshVehicles.find(v => v._id === (updatedJob.vehicleId?._id || updatedJob.vehicleId));

                    if (vehicle && vehicle.vendorId) {
                        const vendorId = typeof vehicle.vendorId === 'string' ? vehicle.vendorId : vehicle.vendorId._id;
                        // We need vendor location. We can find it in vendors state if available, or fetch.
                        // Accessing state inside socket callback is tricky due to closure.
                        // Let's fetch vendors too or assume we have them. 
                        // Better: fetch vendors or rely on the populated vendorId if backend populates it.
                        // Our backend populates vendorId in GET /api/vehicles!

                        const vendor = typeof vehicle.vendorId === 'object' ? vehicle.vendorId : null;

                        if (vendor) {
                            // Calculate return route
                            const res = await fetch(
                                `https://api.mapbox.com/directions/v5/mapbox/driving/${vehicle.location.longitude},${vehicle.location.latitude};${vendor.location.longitude},${vendor.location.latitude}?steps=true&geometries=geojson&access_token=${token}`
                            );
                            const data = await res.json();
                            if (data.routes && data.routes[0]) {
                                const routeGeometry = data.routes[0].geometry;

                                // Visualize return route (optional, maybe distinct color)
                                setJobRoutes(prev => ({
                                    ...prev,
                                    [`return-${vehicle._id}`]: routeGeometry
                                }));

                                socketRef.current?.emit('return_to_base', {
                                    vehicleId: vehicle._id,
                                    routePoints: routeGeometry.coordinates
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error initiating return to base", e);
                }
            }

            // Fetch route if job has vehicle and hospital
            if (updatedJob.vehicleId && updatedJob.hospitalId && updatedJob.status !== 'DELIVERED') {
                const hospital = hospitals.find(h => h._id === updatedJob.hospitalId);
                // We need the vehicle's CURRENT location, which might be in the updatedJob or we find it in vehicles state
                // Ideally we use the vehicle's location from the job update if populated, or fetch it.
                // For now, let's use the vehicle's location from the vehicle list (which is updated via socket)
                // But inside this callback 'vehicles' state is stale. 
                // Let's rely on the vehicle object inside the job if it has location, or just trigger a fetch.

                // Actually, let's just trigger a route update effect.
            }

            // Also refresh vehicles to get status updates
            fetch('http://localhost:5001/api/vehicles')
                .then(res => res.json())
                .then(data => setVehicles(data));
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        // Fetch routes for active jobs
        jobs.forEach(async (job) => {
            if (job.status === 'ASSIGNED' || job.status === 'EN_ROUTE') {
                const vehicle = vehicles.find(v => v._id === job.vehicleId?._id);
                const hospital = hospitals.find(h => h._id === job.hospitalId);

                if (vehicle && hospital && !jobRoutes[job._id]) {
                    try {
                        const res = await fetch(
                            `https://api.mapbox.com/directions/v5/mapbox/driving/${vehicle.location.longitude},${vehicle.location.latitude};${hospital.longitude},${hospital.latitude}?steps=true&geometries=geojson&access_token=${token}`
                        );
                        const data = await res.json();
                        if (data.routes && data.routes[0]) {
                            const routeGeometry = data.routes[0].geometry;
                            setJobRoutes(prev => ({
                                ...prev,
                                [job._id]: routeGeometry
                            }));

                            // Start simulation on server with this route
                            if (job.status === 'ASSIGNED') {
                                socketRef.current?.emit('start_delivery', {
                                    jobId: job._id,
                                    routePoints: routeGeometry.coordinates
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching route", e);
                    }
                }
            }
        });
    }, [jobs, vehicles, hospitals]);

    const createJob = async () => {
        try {
            await fetch('http://localhost:5001/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'OXYGEN',
                    priority: 'CRITICAL',
                    hospitalId: hospitals[0]?._id // Assign to first hospital for demo
                })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical': return 'text-red-500';
            case 'warning': return 'text-orange-500';
            case 'stable': return 'text-blue-500';
            case 'good': return 'text-green-500';
            default: return 'text-gray-500';
        }
    };

    if (!token) return <div>Missing Mapbox Token</div>;

    return (
        <Layout authenticated={true}>
            <div className="relative w-full h-[calc(100vh-80px)] md:h-screen flex">
                {/* Map Area */}
                <div className="flex-grow h-full relative">
                    <Map
                        {...viewState}
                        onMove={(evt) => setViewState(evt.viewState)}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle="mapbox://styles/mapbox/dark-v11"
                        mapboxAccessToken={token}
                    >
                        <NavigationControl position="bottom-right" />
                        <FullscreenControl position="bottom-right" />
                        <ScaleControl position="bottom-left" />

                        {/* Hospital Markers */}
                        {hospitals.map((hospital: any) => (
                            <Marker
                                key={hospital._id}
                                longitude={hospital.longitude}
                                latitude={hospital.latitude}
                                anchor="bottom"
                                onClick={(e) => {
                                    e.originalEvent.stopPropagation();
                                    setPopupInfo(hospital);
                                }}
                            >
                                <MapPin className={`w-8 h-8 ${getStatusColor(hospital.status)} cursor-pointer hover:scale-110 transition-transform`} fill="currentColor" />
                            </Marker>
                        ))}

                        {/* Vendor Markers */}
                        {vendors.map((vendor) => (
                            <Marker
                                key={vendor._id}
                                longitude={vendor.location.longitude}
                                latitude={vendor.location.latitude}
                                anchor="bottom"
                            >
                                <div className="flex flex-col items-center">
                                    <Box className="w-6 h-6 text-purple-500 fill-current" />
                                    <span className="text-[10px] bg-black/50 text-white px-1 rounded mt-1">{vendor.name}</span>
                                </div>
                            </Marker>
                        ))}

                        {/* Vehicle Paths (History) */}
                        {Object.entries(vehiclePaths).map(([id, path]) => (
                            <Source key={`path-${id}`} type="geojson" data={{
                                type: 'Feature',
                                geometry: { type: 'LineString', coordinates: path },
                                properties: {}
                            }}>
                                <Layer
                                    id={`line-${id}`}
                                    type="line"
                                    paint={{
                                        'line-color': '#3b82f6',
                                        'line-width': 4,
                                        'line-opacity': 0.3,
                                        'line-dasharray': [2, 1]
                                    }}
                                />
                            </Source>
                        ))}

                        {/* Active Job Routes (Actual Road Path) */}
                        {Object.entries(jobRoutes).map(([id, geometry]) => (
                            <Source key={`route-${id}`} type="geojson" data={{
                                type: 'Feature',
                                geometry: geometry,
                                properties: {}
                            }}>
                                <Layer
                                    id={`route-layer-${id}`}
                                    type="line"
                                    paint={{
                                        'line-color': '#f97316', // Orange for route
                                        'line-width': 5,
                                        'line-opacity': 0.8
                                    }}
                                />
                            </Source>
                        ))}

                        {/* Job Assignment Arcs */}
                        {jobs.filter(j => j.status !== 'DELIVERED').map(job => {
                            const vehicle = vehicles.find(v => v._id === job.vehicleId?._id);
                            const hospital = hospitals.find(h => h._id === job.hospitalId);
                            if (!vehicle || !hospital) return null;

                            const arcPoints = getCurvedLine(
                                { lng: vehicle.location.longitude, lat: vehicle.location.latitude },
                                { lng: hospital.longitude, lat: hospital.latitude }
                            );

                            return (
                                <Source key={`arc-${job._id}`} type="geojson" data={{
                                    type: 'Feature',
                                    geometry: { type: 'LineString', coordinates: arcPoints },
                                    properties: {}
                                }}>
                                    <Layer
                                        id={`arc-layer-${job._id}`}
                                        type="line"
                                        paint={{
                                            'line-color': '#ef4444', // Red/Primary for assignment
                                            'line-width': 2,
                                            'line-opacity': 0.6,
                                            'line-dasharray': [1, 1]
                                        }}
                                    />
                                </Source>
                            );
                        })}

                        {/* Vehicle Markers */}
                        {vehicles.map((vehicle) => (
                            <AnimatedMarker
                                key={vehicle._id}
                                longitude={vehicle.location.longitude}
                                latitude={vehicle.location.latitude}
                            >
                                <div className="relative">
                                    <div className={`p-2 rounded-full ${vehicle.status === 'BUSY' ? 'bg-blue-500' : 'bg-green-500'} text-white shadow-lg`}>
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    {vehicle.status === 'BUSY' && (
                                        <span className="absolute -top-2 -right-2 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                            </AnimatedMarker>
                        ))}

                        {popupInfo && (
                            <Popup
                                anchor="top"
                                longitude={popupInfo.longitude}
                                latitude={popupInfo.latitude}
                                onClose={() => setPopupInfo(null)}
                                className="text-black"
                            >
                                <div className="p-2">
                                    <h3 className="font-bold">{popupInfo.name}</h3>
                                    <p>ICU: {popupInfo.icuOccupancy}%</p>
                                </div>
                            </Popup>
                        )}
                    </Map>
                </div>

                {/* Sidebar / Overlay */}
                <div className="w-96 bg-background border-l border-border h-full overflow-y-auto p-4 hidden md:block">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="text-primary" /> Logistics
                        </h2>
                        <Button size="sm" onClick={createJob} variant="destructive">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Simulate Emergency
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">Active Tickets</h3>
                        {jobs.length === 0 && <p className="text-muted-foreground text-sm">No active jobs.</p>}

                        {jobs.map(job => (
                            <Card key={job._id} className="border-l-4 border-l-blue-500">
                                <CardHeader className="p-3 pb-1">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm font-bold">{job.type} Delivery</CardTitle>
                                        <Badge variant={job.priority === 'CRITICAL' ? 'destructive' : 'default'}>{job.priority}</Badge>
                                    </div>
                                    <CardDescription className="text-xs">ID: {job._id.slice(-6)}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-3 pt-2 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className="font-medium">{job.status}</span>
                                    </div>
                                    {job.vehicleId && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Vehicle:</span>
                                            <span className="font-medium flex items-center gap-1">
                                                <Truck className="w-3 h-3" /> {job.vehicleId.name}
                                            </span>
                                        </div>
                                    )}
                                    {job.eta && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">ETA:</span>
                                            <span className="font-medium text-orange-500">
                                                {new Date(job.eta).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Maps;
