import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { BusinessSettings } from '@/types';
import { Building2, Save, Upload, Trash2, Globe, Mail, Phone, MapPin, FileText } from 'lucide-react';

export default function Settings() {
  const { settings, setSettings } = useApp();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Settings saved',
      description: 'Your business settings have been updated.',
    });
  };

  const handleChange = (field: keyof BusinessSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 500KB.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings((prev) => ({ ...prev, logo: reader.result as string }));
        toast({
          title: 'Logo uploaded',
          description: 'Your logo has been updated.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setSettings((prev) => ({ ...prev, logo: undefined }));
    toast({
      title: 'Logo removed',
      description: 'Your logo has been removed.',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage your business profile
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo Section */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Business Logo</CardTitle>
            <CardDescription className="text-xs">
              Appears on quotations and invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="h-full w-full object-contain rounded-lg p-1"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors text-xs font-medium"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  {settings.logo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeLogo}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  PNG, JPG or SVG. Max 500KB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Business Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Your Business Name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxNumber" className="text-xs flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  GST/Tax Number
                </Label>
                <Input
                  id="taxNumber"
                  value={settings.taxNumber || ''}
                  onChange={(e) => handleChange('taxNumber', e.target.value)}
                  placeholder="GSTIN"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                Address
              </Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Business address"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="currency" className="text-xs">Default Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) =>
                  handleChange('currency', value as BusinessSettings['currency'])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR - Indian Rupee</SelectItem>
                  <SelectItem value="USD">$ USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                  <SelectItem value="GBP">£ GBP - British Pound</SelectItem>
                  <SelectItem value="OMR">ر.ع. OMR - Omani Rial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" size="sm" className="gap-1.5">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
