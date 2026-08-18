import React, { useState } from 'react';
import { FileText, CreditCard } from 'lucide-react';
import AllDocuments from './document/AllDocuments';
import AllSubscriptions from './subscription/AllSubscriptions';

export const ResourceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'subscriptions'>('documents');

  return (
    <div className="space-y-4">
      {/* Tabs Header */}
      <div className="bg-card p-1.5 rounded-lg shadow-xs border flex gap-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'documents'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <FileText size={15} />
          <span>Documents Management</span>
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <CreditCard size={15} />
          <span>Subscriptions Management</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>{activeTab === 'documents' ? <AllDocuments /> : <AllSubscriptions />}</div>
    </div>
  );
};

export default ResourceManager;
