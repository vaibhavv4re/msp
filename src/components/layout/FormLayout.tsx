import React from 'react';
import { useRouter } from 'next/navigation';

interface FormLayoutProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    primaryAction?: {
        label: string;
        onClick: (e: React.FormEvent) => void;
        disabled?: boolean;
        loading?: boolean;
    };
    footer?: React.ReactNode;
}

export function MobilePageLayout({ title, subtitle, onClose, children, primaryAction, footer }: FormLayoutProps) {
    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 -ml-2 text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-gray-900">{title}</h1>
                        {subtitle && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{subtitle}</p>}
                    </div>
                </div>
                {primaryAction && (
                    <button
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled || primaryAction.loading}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {primaryAction.loading ? 'Saving...' : primaryAction.label}
                    </button>
                )}
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
                {children}
            </main>

            {/* Bottom Sticky Action for long forms if needed */}
            {footer && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12 border-t border-gray-100">
                    {footer}
                </div>
            )}
        </div>
    );
}

export function DesktopModalLayout({ title, subtitle, onClose, children, primaryAction }: FormLayoutProps) {
    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-8 pb-4 flex justify-between items-start border-b flex-shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{title}</h2>
                        {subtitle && <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                    {children}
                </div>

                {primaryAction && (
                    <div className="p-8 border-t flex justify-end gap-4 flex-shrink-0 bg-gray-50/50">
                        <button onClick={onClose} className="px-6 py-2 text-xs font-black uppercase text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                        <button
                            onClick={primaryAction.onClick}
                            disabled={primaryAction.disabled || primaryAction.loading}
                            className="px-10 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {primaryAction.loading ? 'Saving...' : primaryAction.label}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
