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
      const isInstalled = window.navigator.standalone || isStandalone;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
      const userAgent = navigator.userAgent;
      
      setPwaInfo({
        isInstalled,
        isStandalone,
        hasServiceWorker,
        hasManifest,
        userAgent,
        canInstall: hasServiceWorker && hasManifest
      });
    };

    checkPWAStatus();
    
    // Check for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      setPwaInfo(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
        </div>
      </CardContent>
    </Card>
  );
};
