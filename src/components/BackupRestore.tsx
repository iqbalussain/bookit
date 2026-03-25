import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Database, Download, Upload, Info } from 'lucide-react';

export default function BackupRestore() {
  const { selectedCompanyId, companies } = useApp();
  const [dbPath, setDbPath] = useState<string>('');
  const { toast } = useToast();

  const companyName = companies.find((c) => c.id === selectedCompanyId)?.name || 'default';

  useEffect(() => {
    const loadDbPath = async () => {
      try {
        const path = await window.electronAPI!.getDbPath();
        setDbPath(path);
      } catch (error) {
        console.error('Failed to get database path:', error);
      }
    };

    if (window.electronAPI) {
      loadDbPath();
    }
  }, []);

  const handleBackup = async () => {
    try {
      const result = await window.electronAPI!.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: `${companyName.replace(/\s+/g, '-')}-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      });

      if (!result.canceled && result.filePath) {
        await window.electronAPI!.backup(result.filePath);
        toast({
          title: 'Backup saved successfully!',
          description: `Database backed up to: ${result.filePath}`,
        });
      }
    } catch (error) {
      console.error('Backup failed:', error);
      toast({
        title: 'Backup failed',
        description: 'An error occurred while creating the backup.',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select Database Backup',
        filters: [{ name: 'Database Files', extensions: ['db'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        await window.electronAPI.restore(result.filePaths[0]);
        toast({
          title: 'Restore complete!',
          description: 'Please restart the application for changes to take effect.',
        });
      }
    } catch (error) {
      console.error('Restore failed:', error);
      toast({
        title: 'Restore failed',
        description: 'An error occurred while restoring the backup.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Data Backup & Restore
        </CardTitle>
        <CardDescription className="text-xs">
          Backup your data or restore from a previous backup
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleBackup}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Download className="h-4 w-4" />
            Create Backup
          </Button>
          <Button
            onClick={handleRestore}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Upload className="h-4 w-4" />
            Restore Backup
          </Button>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium">Database Location</p>
              <p className="text-xs text-muted-foreground break-all">
                {dbPath || 'Loading...'}
              </p>
              <p className="text-xs text-muted-foreground">
                Your data is stored in a single file. Copy this file to backup manually or use the buttons above.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}