declare module 'react-map-gl' {
    import * as React from 'react';

    export interface ViewState {
        longitude: number;
        latitude: number;
        zoom: number;
        bearing?: number;
        pitch?: number;
    }

    export interface MapProps {
        longitude?: number;
        latitude?: number;
        zoom?: number;
        bearing?: number;
        pitch?: number;
        initialViewState?: ViewState;
        mapboxAccessToken?: string;
        mapStyle?: string;
        children?: React.ReactNode;
        onMove?: (evt: { viewState: ViewState }) => void;
        style?: React.CSSProperties;
        width?: string | number;
        height?: string | number;
    }

    export interface NavigationControlProps {
        position?: string;
    }
    export interface ControlProps {
        position?: string;
    }
    export interface SourceProps {
        type: string;
        data: any;
        children?: React.ReactNode;
    }
    export interface LayerProps {
        id?: string;
        type?: string;
        paint?: any;
        maxzoom?: number;
    }
    export interface MarkerProps {
        longitude: number;
        latitude: number;
        anchor?: string;
        onClick?: (e: any) => void;
        children?: React.ReactNode;
    }
    export interface PopupProps {
        longitude: number;
        latitude: number;
        anchor?: string;
        onClose?: () => void;
        className?: string;
        children?: React.ReactNode;
    }

    export const NavigationControl: React.FC<NavigationControlProps>;
    export const FullscreenControl: React.FC<ControlProps>;
    export const ScaleControl: React.FC<ControlProps>;
    export const Source: React.FC<SourceProps>;
    export const Layer: React.FC<LayerProps>;
    export const Marker: React.FC<MarkerProps>;
    export const Popup: React.FC<PopupProps>;

    const Map: React.ComponentType<MapProps>;
    export default Map;
}
