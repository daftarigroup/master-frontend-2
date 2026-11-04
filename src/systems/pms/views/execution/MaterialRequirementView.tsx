// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Eye, X, FileText, Info, ArrowLeft, Building2, MapPin, Calendar, Tag, FilePlus } from 'lucide-react';
import { getReqMaterials, getProjectOrMinor } from '@/systems/pms/utils/storageManager';
import DataTable from '@/systems/pms/components/DataTable';
import InfoPopover from '@/systems/pms/components/InfoPopover';
import Reqmaterial from './Reqmaterial';

export default function AllReqMaterial() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [reqMaterials, setReqMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showReqModal, setShowReqModal] = useState(false);
  const [viewScope, setViewScope] = useState(projectNo ? 'project' : 'all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    setReqMaterials(getReqMaterials());
    if (projectNo) {
      const decodedNo = decodeURIComponent(projectNo);
      const found = getProjectOrMinor(decodedNo);
      setProject(found || null);
    }
  }, [projectNo]);

  // Flatten indents by product for table display
  const flattenedRows = reqMaterials.flatMap(indent =>
    (indent.items || []).map(item => ({
      ...indent,
      ...item,
      reqId: indent.id
    }))
  ).reverse();

  const filteredRows = flattenedRows.filter(row => {
    if (project && viewScope === 'project') {
      const matchProject = row.projectNo === project.serialNo || row.projectName === project.projectName;
      if (!matchProject) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (row.indentNo || '').toLowerCase().includes(q) ||
      (row.projectName || '').toLowerCase().includes(q) ||
      (row.groupHead || '').toLowerCase().includes(q) ||
      (row.productName || '').toLowerCase().includes(q) ||
      (row.indenterName || '').toLowerCase().includes(q) ||
      (row.indentStatus || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleImageView = (base64) => {
    setSelectedImage(base64);
    setShowImageModal(true);
  };

  const tableHeaders = [
    "Indent No", "Indent Date", "Project Name", "Group Head", "Product Name", "Area Of Use",
    "Indent Qty", "UOM", "Expected Requirement", "Attachment", "Specification",
    "Indenter Name", "Indent Status"
  ];

  const renderRow = (item) => (
    <tr key={`${item.reqId}-${item.itemCount}`} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">{item.indentNo}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.indentDate}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-900 font-medium whitespace-nowrap">{item.projectName}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.groupHead}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-900 font-medium whitespace-nowrap">{item.productName}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.areaOfUse}</td>
      <td className="px-4 py-3 text-center text-[11px] text-indigo-600 font-bold whitespace-nowrap">{item.qty}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.uom}</td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.expectedRequirement || '-'}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        {item.attachment ? (
          <button
            onClick={() => handleImageView(item.attachment)}
            className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full"
          >
            <Eye size={16} />
          </button>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-left whitespace-nowrap">
        {item.specification ? (
          <InfoPopover items={[item.specification]} title="Specification">
            <span className="text-[11px] text-gray-500 flex items-center gap-1 cursor-help hover:text-indigo-600">
              <Info size={12} /> View Info
            </span>
          </InfoPopover>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap">{item.indenterName}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
          item.indentStatus === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {item.indentStatus}
        </span>
      </td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={`${item.reqId}-${item.itemCount}`} className="bg-white rounded-lg border border-indigo-50 shadow-sm p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[9px] text-indigo-500 uppercase tracking-widest">{item.indentNo}</span>
          <h4 className="text-sm text-gray-900">{item.productName}</h4>
        </div>
        <span className={`px-2 py-0.5 rounded text-[8px] uppercase ${
          item.indentStatus === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {item.indentStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Project</p>
          <p className="text-gray-700 truncate leading-tight">{item.projectName}</p>
        </div>
        <div>
          <span className="text-gray-400 block uppercase text-[9px]">Qty</span>
          <span className="text-indigo-600 font-bold">{item.qty} {item.uom}</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded p-2 text-[10px] space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Group Head:</span>
          <span className="text-gray-700">{item.groupHead}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Area Of Use:</span>
          <span className="text-gray-700">{item.areaOfUse}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Indenter:</span>
          <span className="text-gray-700">{item.indenterName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date:</span>
          <span className="text-gray-700">{item.indentDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Expected Req.:</span>
          <span className="text-gray-700">{item.expectedRequirement || '-'}</span>
        </div>
      </div>

      {item.attachment && (
        <button
          onClick={() => handleImageView(item.attachment)}
          className="w-full bg-indigo-50 text-indigo-600 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-2"
        >
          <Eye size={14} /> View Attachment
        </button>
      )}
    </div>
  );

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <button
          onClick={() => project ? (project.isMinor ? navigate(`/pms/minors/${encodeURIComponent(project.parentProjectNo)}`) : navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)) : navigate('/pms/execution')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit flex-shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        {project && (
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-semibold">
            <button
              onClick={() => { setViewScope('project'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md transition ${viewScope === 'project' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              This Project ({flattenedRows.filter(r => r.projectNo === project.serialNo || r.projectName === project.projectName).length})
            </button>
            <button
              onClick={() => { setViewScope('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-md transition ${viewScope === 'all' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All Requirements ({flattenedRows.length})
            </button>
          </div>
        )}

        {project && (
          <button
            onClick={() => setShowReqModal(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm transition flex-shrink-0"
          >
            <FilePlus size={16} /> Add Material Requirement
          </button>
        )}
      </div>

      {/* Project Header Banner */}
      {project && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex items-start gap-2 min-w-0">
              <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project No</p>
                <p className="text-base md:text-lg text-indigo-600 font-bold truncate">{project.serialNo}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <Building2 size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
                <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.projectName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <MapPin size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Location</p>
                <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.projectLocation}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <Calendar size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Start Date</p>
                <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.startDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <Calendar size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Planned End Date</p>
                <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.plannedEndDate}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={tableHeaders}
          data={paginatedRows}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1850px"
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalResults={filteredRows.length}
        />
      </div>

      {/* Add Requirement Modal */}
      {project && (
        <Reqmaterial
          isOpen={showReqModal}
          onClose={() => setShowReqModal(false)}
          project={project}
          onSaved={() => {
            setShowReqModal(false);
            setReqMaterials(getReqMaterials());
          }}
        />
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-2 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors z-10 border border-gray-200"
            >
              <X size={20} />
            </button>
            <div className="overflow-auto max-h-[85vh] rounded-xl">
              {selectedImage.startsWith('data:image/') ? (
                <img src={selectedImage} alt="Attachment" className="w-full h-auto" />
              ) : (
                <div className="p-10 text-center">
                  <FileText size={48} className="mx-auto text-indigo-200 mb-4" />
                  <p className="text-gray-600">Document Preview Not Available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
