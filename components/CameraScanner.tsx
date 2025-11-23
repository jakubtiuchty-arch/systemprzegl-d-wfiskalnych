import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap } from 'lucide-react';

interface CameraScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

// Define the BarcodeDetector interface as it's not fully standard in all TS envs yet
declare class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string, format: string }>>;
    static getSupportedFormats(): Promise<string[]>;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');
    const [useNative, setUseNative] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('Inicjalizacja...');

    // Refs for cleanup
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<any>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(true);

    // Regex for N/U codes (3 letters + digits/chars)
    const isValidNuCode = (code: string): boolean => {
        return /^[A-Z]{3}\s?[A-Z0-9]+$/i.test(code);
    };

    useEffect(() => {
        const initScanner = async () => {
            // Check for native BarcodeDetector support
            if ('BarcodeDetector' in window) {
                try {
                    const formats = await BarcodeDetector.getSupportedFormats();
                    if (formats.includes('code_128') || formats.includes('qr_code')) {
                        setUseNative(true);
                        startNativeScanner();
                        return;
                    }
                } catch (e) {
                    console.warn("BarcodeDetector check failed, falling back", e);
                }
            }

            // Fallback
            startHtml5Scanner();
        };

        initScanner();

        return () => {
            stopScanner();
        };
    }, []);

    const stopScanner = () => {
        isScanningRef.current = false;

        // Stop native stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Clear native interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Stop Html5Qrcode
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(console.error);
            html5QrCodeRef.current.clear();
        }
    };

    const startNativeScanner = async () => {
        setDebugInfo('Używam natywnego skanera (Szybki)');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                const detector = new BarcodeDetector({
                    formats: ['code_128', 'qr_code', 'ean_13', 'code_39']
                });

                intervalRef.current = setInterval(async () => {
                    if (!videoRef.current || !isScanningRef.current) return;

                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0) {
                            // Filter for N/U code
                            const nuCode = barcodes.find(b => isValidNuCode(b.rawValue));

                            if (nuCode) {
                                onScan(nuCode.rawValue);
                                stopScanner();
                            } else {
                                // Optional: Feedback that we see codes but they are wrong
                                // setDebugInfo(`Widzę kody: ${barcodes.map(b => b.rawValue).join(', ')}`);
                            }
                        }
                    } catch (e) {
                        console.error("Detection error", e);
                    }
                }, 100); // Check every 100ms
            }
        } catch (err) {
            console.error(err);
            setError('Błąd kamery (Native).');
            startHtml5Scanner(); // Try fallback
        }
    };

    const startHtml5Scanner = async () => {
        setDebugInfo('Używam skanera JS (Fallback)');
        try {
            const html5QrCode = new Html5Qrcode("reader");
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    if (isScanningRef.current) {
                        // Here we can't easily get multiple codes, so we just pass what we get
                        // The parent component will filter it, but it might be the wrong one.
                        // This is why native is better.
                        onScan(decodedText);
                        // Don't stop immediately in fallback if it's wrong? 
                        // Actually parent handles logic. We just close.
                        stopScanner();
                    }
                },
                () => { }
            );
        } catch (err) {
            console.error(err);
            setError('Błąd dostępu do kamery.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex justify-between items-center p-4 bg-black text-white">
                <div className="flex items-center gap-2">
                    <Camera size={24} />
                    <span className="font-bold text-lg">Skaner {useNative && <Zap size={16} className="inline text-yellow-400" fill="currentColor" />}</span>
                </div>
                <button onClick={() => { stopScanner(); onClose(); }} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {error ? (
                    <div className="text-white text-center p-6">
                        <p className="text-red-500 text-xl mb-2">Błąd</p>
                        <p>{error}</p>
                        <button onClick={onClose} className="mt-4 px-6 py-2 bg-white text-black rounded-lg font-semibold">
                            Zamknij
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center relative">
                        {useNative ? (
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                playsInline
                                muted
                            />
                        ) : (
                            <div id="reader" className="w-full max-w-md"></div>
                        )}

                        {/* Overlay Guide */}
                        <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-40 border-2 border-blue-500 rounded-lg bg-blue-500/10 relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                            </div>
                        </div>

                        <div className="absolute bottom-10 left-0 right-0 text-center text-white/90 pointer-events-none px-4">
                            <p className="text-sm font-bold mb-1">{debugInfo}</p>
                            <p className="text-xs opacity-75">Nakieruj kamerę na kod N/U (np. BFL...)</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CameraScanner;
