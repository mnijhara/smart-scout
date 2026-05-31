import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, Shield } from 'lucide-react';

interface SelfieCaptureProps {
  onCapture: (base64Photo: string) => void;
  candidateName: string;
}

export const SelfieCapture: React.FC<SelfieCaptureProps> = ({ onCapture, candidateName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionGranted(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Please allow camera permissions to verify your identity before starting the interview.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally to match mirror preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photo) {
      onCapture(photo);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl glass-panel animate-fadeIn text-center border border-slate-800">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full">
          <Shield size={32} />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mb-2">Identity Verification</h2>
      <p className="text-sm text-slate-400 mb-6">
        Hi {candidateName}, please take a quick selfie to verify your identity before we begin the audio interview.
      </p>

      {error ? (
        <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          <button 
            onClick={startCamera} 
            className="mt-3 block w-full py-2 bg-red-500/20 hover:bg-red-500/30 transition text-white rounded-lg font-medium"
          >
            Retry Camera Access
          </button>
        </div>
      ) : (
        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 mb-6 border border-slate-800 flex items-center justify-center">
          {!photo ? (
            <>
              {/* Circular guide overlay */}
              <div className="absolute inset-0 border-4 border-dashed border-indigo-500/30 rounded-full m-8 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-full h-full border border-indigo-500/10 rounded-full"></div>
              </div>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </>
          ) : (
            <img 
              src={photo} 
              alt="Verification" 
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {permissionGranted && !error && (
        <div className="flex justify-center gap-4">
          {!photo ? (
            <button
              onClick={capturePhoto}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition text-white rounded-xl font-medium w-full"
            >
              <Camera size={18} />
              Capture Verification Photo
            </button>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 transition text-slate-300 rounded-xl font-medium w-1/2"
              >
                <RefreshCw size={18} />
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 transition text-white rounded-xl font-medium w-1/2"
              >
                <CheckCircle size={18} />
                Confirm & Start
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
