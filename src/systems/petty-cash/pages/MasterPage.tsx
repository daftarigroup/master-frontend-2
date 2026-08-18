import React, { useState } from 'react';
import { Boxes } from 'lucide-react';
import MasterListTab from './MasterListTab';

const TABS = [
  { key: 'groupHeads', label: 'Group Heads', type: 'groupHead', title: 'Manage Group Heads', placeholder: 'Enter group head name' },
  { key: 'projectNames', label: 'Project Name', type: 'project', title: 'Manage Project Names', placeholder: 'Enter project name' },
  { key: 'docDocumentType', label: 'Document Type', type: 'docDocumentType', title: 'Manage Document Types', placeholder: 'Enter document type' },
  { key: 'docCategory', label: 'Category', type: 'docCategory', title: 'Manage Categories', placeholder: 'Enter category' },
];

export const MasterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const active = TABS.find((t) => t.key === activeTab) || TABS[0];

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Boxes size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Master Management</h1>
            <p className="text-xs text-muted-foreground">Manage dropdown items and lookup values across modules</p>
          </div>
        </div>
      </div>

      <div className="border-b">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <MasterListTab key={active.key} type={active.type} title={active.title} placeholder={active.placeholder} />
    </div>
  );
};

export default MasterPage;
