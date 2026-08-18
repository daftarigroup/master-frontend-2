import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';
import { subscriptionsApi } from '../../services/document.api';
import { MacModal } from '@/components/ui/mac-modal';

interface AddSubscriptionProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const AddSubscription: React.FC<AddSubscriptionProps> = ({ isOpen, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    subscriberName: '',
    subscriptionName: '',
    price: '',
    frequency: '',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await subscriptionsApi.create({
        ...formData,
        requestedDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Subscription added successfully');
      setFormData({
        companyName: '',
        subscriberName: '',
        subscriptionName: '',
        price: '',
        frequency: '',
        purpose: '',
      });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error adding subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Subscription"
      subtitle="Record a new recurring software or service subscription"
      maxWidth="lg"
      bodyClassName="p-6 space-y-3.5 overflow-y-auto"
      footer={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-sub-form"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save size={14} /> {submitting ? 'Saving...' : 'Save Subscription'}
          </button>
        </div>
      }
    >
      <form id="add-sub-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Company / Vendor <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. AWS, Microsoft"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Subscriber Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.subscriberName}
              onChange={(e) => setFormData({ ...formData, subscriberName: e.target.value })}
              placeholder="e.g. John Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground/80 mb-1">
            Subscription Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
            value={formData.subscriptionName}
            onChange={(e) => setFormData({ ...formData, subscriptionName: e.target.value })}
            placeholder="e.g. Google Workspace Business Plus"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Price (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g. ₹1,500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Billing Frequency <span className="text-destructive">*</span>
            </label>
            <select
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            >
              <option value="" disabled>
                Select Frequency
              </option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground/80 mb-1">
            Purpose / Justification <span className="text-destructive">*</span>
          </label>
          <textarea
            required
            rows={2}
            className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none resize-none"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Why is this subscription required?"
          />
        </div>
      </form>
    </MacModal>
  );
};

export default AddSubscription;
