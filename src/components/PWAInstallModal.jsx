import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, Wifi, Battery, Shield } from 'lucide-react';

const PWAInstallModal = ({ isOpen, onClose, onInstall }) => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const features = [
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Native App Experience",
      description: "Access your fitness platform like a native mobile app"
    },
    {
      icon: <Wifi className="h-6 w-6" />,
      title: "Offline Access",
      description: "Continue working even without internet connection"
    },
    {
      icon: <Battery className="h-6 w-6" />,
      title: "Better Performance",
      description: "Faster loading and improved battery life"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Private",
      description: "Your data stays secure with encrypted storage"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#262626]">
          <h2 className="text-xl font-semibold text-white">Install Kaiylo App</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#e87c3e] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  Get the full Kaiylo experience
                </h3>
                <p className="text-gray-400 text-sm">
                  Install our app for a better mobile experience with offline access and faster performance.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="text-[#e87c3e] mt-1">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">
                        {feature.title}
                      </h4>
                      <p className="text-gray-400 text-xs">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={onInstall}
                  className="flex-1 px-4 py-2 bg-[#e87c3e] hover:bg-[#d66d35] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Installation in progress...
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Please follow the prompts on your device to complete the installation.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#e87c3e] hover:bg-[#d66d35] text-white rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallModal;
