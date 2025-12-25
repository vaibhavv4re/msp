"use client";

import React, { useState, useEffect } from "react";
import { Download, X, PlusSquare, Share } from "lucide-react";

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Register Service Worker
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker.register("/sw.js").catch((err) => {
                    console.error("Service Worker registration failed:", err);
                });
            });
        }

        // Check if app is already installed/standalone
        const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches
            || (window.navigator as any).standalone
            || document.referrer.includes("android-app://");
        setIsStandalone(isStandaloneMode);

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Handle android/chrome install prompt
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if not dismissed and not already standalone
            if (!localStorage.getItem("pwa_prompt_dismissed") && !isStandaloneMode) {
                setTimeout(() => {
                    setShowPrompt(true);
                }, 2000);
            }
        };

        window.addEventListener("beforeinstallprompt", handler);

        // For iOS, we check explicitly as there's no event
        if (isIOSDevice && !localStorage.getItem("pwa_prompt_dismissed") && !isStandaloneMode) {
            setTimeout(() => {
                setShowPrompt(true);
            }, 2000);
        }

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setDeferredPrompt(null);
                setShowPrompt(false);
            }
        }
    };

    const dismissPrompt = () => {
        localStorage.setItem("pwa_prompt_dismissed", "true");
        setShowPrompt(false);
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[32px] shadow-2xl shadow-black/10 p-6 flex flex-col gap-4">
                {/* Close Button */}
                <button
                    onClick={dismissPrompt}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                        <span className="text-white font-black text-[10px] italic tracking-tighter">BACKDROP</span>
                    </div>
                    <div className="flex-1 pr-6">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Install BACKDROP Suite</h4>
                        <p className="text-[11px] font-bold text-gray-500 uppercase leading-relaxed mt-0.5">
                            Add to your home screen for a premium, lightning-fast experience.
                        </p>
                    </div>
                </div>

                <div className="h-px bg-gray-100 w-full"></div>

                {isIOS ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 italic font-black text-blue-600">1</div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-tight">
                                Tap the <Share className="w-3.5 h-3.5 inline-block mx-1 mb-1 text-blue-600" /> share icon in Safari
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 italic font-black text-blue-600">2</div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-tight">
                                Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline-block mx-1 mb-1 text-gray-900" /> "Add to Home Screen"
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={handleInstallClick}
                            className="flex-1 bg-black text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gray-900 transition-all shadow-xl shadow-gray-200"
                        >
                            <Download className="w-4 h-4" />
                            Install App
                        </button>
                        <button
                            onClick={dismissPrompt}
                            className="px-6 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:text-gray-900 transition-all border border-gray-100"
                        >
                            Not Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
