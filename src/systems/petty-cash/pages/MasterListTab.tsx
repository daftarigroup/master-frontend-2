import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';
import { mastersApi } from '../services/pettyCash.api';

interface MasterListTabProps {
  type: string;
  title: string;
  placeholder: string;
}

export const MasterListTab: React.FC<MasterListTabProps> = ({ type, title, placeholder }) => {
  const [items, setItems] = useState<any[]>([]);
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadItems = () => {
    setLoading(true);
    mastersApi
      .list(type)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setItems(list);
      })
      .catch((error: any) => {
        console.error(error);
        toast.error(error.message || `Failed to load ${title.toLowerCase()}`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, [type]);

  const handleAdd = async () => {
    if (!newValue.trim()) {
      toast.error('Please enter a value');
      return;
    }

    setSubmitting(true);
    try {
      await mastersApi.create({ type, value: newValue.trim() });
      setNewValue('');
      toast.success('Added successfully!');
      loadItems();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error adding entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mastersApi.delete(id);
      toast.success('Deleted!');
      setItems(prev => prev.filter(item => item.id !== id));
      await loadItems();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error deleting entry');
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-xs p-5">
      <h2 className="text-sm font-bold text-foreground mb-4">{title}</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-background border border-input rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-1.5 px-4 rounded-md transition text-xs disabled:opacity-50 shadow-xs"
        >
          <Plus size={14} /> {submitting ? 'Adding...' : 'Add'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-muted/40 border rounded-md p-2.5 flex items-center justify-between hover:bg-muted/70 transition"
          >
            <span className="text-xs font-medium text-foreground truncate mr-2">{item.value}</span>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="text-muted-foreground hover:text-destructive transition p-1"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-6">
          {loading ? 'Loading...' : 'Nothing added yet.'}
        </p>
      )}
    </div>
  );
};

export default MasterListTab;
