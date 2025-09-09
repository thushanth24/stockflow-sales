import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const PWADebug: React.FC = () => {
  const [pwaInfo, setPwaInfo] = useState({
    isInstalled: false,
    isStandalone: false,
    hasServiceWorker: false,
    hasManifest: false,
    userAgent: '',
    canInstall: false
  });

  useEffect(() => {
    const checkPWAStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      // iOS Safari specific detection
      const isIOSStandalone = isIOS && (window.navigator.standalone === true);
      const isInstalled = isIOSStandalone || isStandalone;
      
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
      const userAgent = navigator.userAgent;
      const isSecureContext = window.isSecureContext;
      const protocol = window.location.protocol;
      
      setPwaInfo({
        isInstalled,
        isStandalone: isStandalone || isIOSStandalone,
        hasServiceWorker,
        hasManifest,
        userAgent,
        canInstall: hasServiceWorker && hasManifest && isSecureContext
      });
    };

    checkPWAStatus();
    
    // Check for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      setPwaInfo(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for display mode changes
    const handleDisplayModeChange = () => {
      checkPWAStatus();
    };
    
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstall = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>PWA Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Installed:</strong>
            <Badge variant={pwaInfo.isInstalled ? "default" : "secondary"}>
              {pwaInfo.isInstalled ? "Yes" : "No"}
            </Badge>
          </div>
          <div>
            <strong>Standalone Mode:</strong>
            <Badge variant={pwaInfo.isStandalone ? "default" : "secondary"}>
              {pwaInfo.isStandalone ? "Yes" : "No"}
            </Badge>
          </div>
          <div>
            <strong>Service Worker:</strong>
            <Badge variant={pwaInfo.hasServiceWorker ? "default" : "secondary"}>
              {pwaInfo.hasServiceWorker ? "Supported" : "Not Supported"}
            </Badge>
          </div>
          <div>
            <strong>Manifest:</strong>
            <Badge variant={pwaInfo.hasManifest ? "default" : "secondary"}>
              {pwaInfo.hasManifest ? "Found" : "Not Found"}
            </Badge>
          </div>
        </div>
        
        <div>
          <strong>Can Install:</strong>
          <Badge variant={pwaInfo.canInstall ? "default" : "secondary"}>
            {pwaInfo.canInstall ? "Yes" : "No"}
          </Badge>
        </div>
        
        <div>
          <strong>User Agent:</strong>
          <p className="text-sm text-gray-600 break-all">{pwaInfo.userAgent}</p>
        </div>
        
        <div>
          <strong>Secure Context:</strong>
          <Badge variant={window.isSecureContext ? "default" : "destructive"}>
            {window.isSecureContext ? "Yes (HTTPS)" : "No (HTTP)"}
          </Badge>
        </div>
        
        <div>
          <strong>Protocol:</strong>
          <Badge variant={window.location.protocol === 'https:' ? "default" : "secondary"}>
            {window.location.protocol}
          </Badge>
        </div>
        
        <div>
          <strong>iOS Standalone:</strong>
          <Badge variant={window.navigator.standalone ? "default" : "secondary"}>
            {window.navigator.standalone ? "Yes" : "No"}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleInstall} variant="outline">
            Register Service Worker
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Installation Instructions:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Android Chrome:</strong> Menu → "Add to Home screen"</li>
            <li><strong>iOS Safari:</strong> Share → "Add to Home Screen"</li>
            <li><strong>Desktop Chrome:</strong> Look for install icon in address bar</li>
          </ul>
          
          {!window.isSecureContext && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-yellow-800 font-semibold">⚠️ HTTPS Required for iOS PWA</p>
              <p className="text-yellow-700 text-xs mt-1">
                iOS Safari requires HTTPS for PWAs to work properly. 
                Deploy to a HTTPS server or use ngrok for testing.
              </p>
            </div>
          )}
          
          {window.navigator.standalone === false && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-400 rounded">
              <p className="text-blue-800 font-semibold">📱 iOS PWA Tips</p>
              <ul className="text-blue-700 text-xs mt-1 list-disc list-inside space-y-1">
                <li>Make sure you're opening from the home screen icon, not Safari bookmarks</li>
                <li>Try clearing Safari cache and reinstalling</li>
                <li>Check that the app icon appears on your home screen</li>
                <li>iOS may take a few seconds to recognize the PWA</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
