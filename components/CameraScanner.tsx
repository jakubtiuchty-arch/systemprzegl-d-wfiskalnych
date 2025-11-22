import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface CameraScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string>('');
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const startScanner = async () => {
            try {
                // Use the back camera by default
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    const cameraId = devices[0].id; // Usually the back camera on mobile devices comes first or we can filter

                    // Create instance
                    const html5QrCode = new Html5Qrcode("reader");
                    scannerRef.current = html5QrCode;

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        formatsToSupport: [
                            Html5QrcodeSupportedFormats.QR_CODE,
                            Html5QrcodeSupportedFormats.CODE_128,
                            Html5QrcodeSupportedFormats.CODE_39,
                            Html5QrcodeSupportedFormats.EAN_13,
                        ]
                    };

                    await html5QrCode.start(
                        { facingMode: "environment" }, // Prefer back camera
                        config,
                        (decodedText) => {
                            // Success callback
                            if (isScanning) {
                                onScan(decodedText);
                                stopScanner();
                            }
                        },
                        (errorMessage) => {
                            // Error callback (scanning in progress)
                            // console.log(errorMessage);
                        }
                    );
                } else {
                    setError('Nie wykryto kamery.');
                }
            } catch (err) {
                console.error(err);
                setError('Błąd dostępu do kamery. Sprawdź uprawnienia.');
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        setIsScanning(false);
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex justify-between items-center p-4 bg-black text-white">
                <div className="flex items-center gap-2">
                    <Camera size={24} />
                    <span className="font-bold text-lg">Skaner</span>
                </div>
                <button onClick={handleClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {error ? (
                    <div className="text-white text-center p-6">
                        <p className="text-red-500 text-xl mb-2">Błąd</p>
                        <p>{error}</p>
                        <button
                            onClick={handleClose}
                            className="mt-4 px-6 py-2 bg-white text-black rounded-lg font-semibold"
                        >
                            Zamknij
                        </button>
                    </div>
                ) : (
                    <div id="reader" className="w-full max-w-md"></div>
                )}

                {!error && (
                    <div className="absolute bottom-20 left-0 right-0 text-center text-white/70 pointer-events-none">
                        <p className="text-sm">Nakieruj kamerę na kod kreskowy lub QR</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CameraScanner;
