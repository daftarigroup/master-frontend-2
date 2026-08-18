import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Plus, Trash2 } from 'lucide-react';
import { settingsApi } from '../services/pettyCash.api';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>({ paymentModes: [] });
  const [newPaymentMode, setNewPaymentMode] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    setLoading(true);
    settingsApi
      .get()
      .then((res: any) => {
        setSettings(res?.data || res || { paymentModes: [] });
      })
      .catch((error: any) => {
        console.error(error);
        toast.error(error.message || 'Failed to load settings');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleAddPaymentMode = async () => {
    if (!newPaymentMode.trim()) {
      toast.error('Please enter a payment mode');
      return;
    }
    try {
      await settingsApi.addPaymentMode(newPaymentMode.trim());
      setNewPaymentMode('');
      toast.success('Payment mode added!');
      loadSettings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error adding payment mode');
    }
  };

  const handleRemovePaymentMode = async (name: string) => {
    try {
      await settingsApi.removePaymentMode(name);
      toast.success('Payment mode removed!');
      loadSettings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error removing payment mode');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border rounded-lg p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Petty Cash Settings</h1>
            <p className="text-xs text-muted-foreground">Manage system defaults, payment modes, and configurations</p>
          </div>
        </div>
      </div>

      {/* Payment Modes */}
      <div className="bg-card border rounded-lg shadow-xs p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Configured Payment Modes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            These payment modes will appear across all credit &amp; expense transaction forms.
          </p>
        </div>

        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newPaymentMode}
            onChange={(e) => setNewPaymentMode(e.target.value)}
            placeholder="e.g. Corporate Card, Petty Voucher..."
            className="flex-1 bg-background border border-input rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPaymentMode()}
          />
          <button
            type="button"
            onClick={handleAddPaymentMode}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-1.5 px-4 rounded-md transition text-xs shadow-xs"
          >
            <Plus size={14} /> Add Mode
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
          {(settings.paymentModes || []).map((mode: string) => (
            <div
              key={mode}
              className="bg-muted/40 border rounded-md p-2.5 flex items-center justify-between hover:bg-muted/70 transition"
            >
              <span className="text-xs font-semibold text-foreground">{mode}</span>
              <button
                type="button"
                onClick={() => handleRemovePaymentMode(mode)}
                className="text-muted-foreground hover:text-destructive transition p-1"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {(!settings.paymentModes || settings.paymentModes.length === 0) && (
          <p className="text-center text-xs text-muted-foreground py-6">
            {loading ? 'Loading settings...' : 'No custom payment modes configured.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default Settings;
