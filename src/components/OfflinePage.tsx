import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflinePage: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto text-center p-6">
        <div className="mb-6">
          <WifiOff className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You're Offline
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          It looks like you're not connected to the internet. Some features may not be available.
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleRefresh}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Check your internet connection and try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
};
