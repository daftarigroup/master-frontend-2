import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { documentsApi } from '../../services/document.api';
import { MacModal } from '@/components/ui/mac-modal';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'whatsapp' | 'both' | null;
  documentId: string | null;
  documentIds?: string[];
  documentName: string;
  onSaved?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  type,
  documentId,
  documentIds,
  documentName,
  onSaved,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubject(`Sharing Document: ${documentName}`);
      setMessage(`Please find attached the document: ${documentName}`);
    }
  }, [isOpen, documentName]);

  if (!isOpen || !type) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId && (!documentIds || documentIds.length === 0)) {
      toast.error('Select document to share.');
      return;
    }

    const effectiveTargetId = documentId || 'batch';
    const effectiveDocIds = documentIds && documentIds.length > 0 ? documentIds : (documentId !== 'batch' && documentId ? [documentId] : []);

    setSubmitting(true);
    try {
      if (type === 'both') {
        const emailRes: any = await documentsApi.recordShare(effectiveTargetId, {
          sharedVia: 'Email',
          recipientName: recipientName || 'Multiple',
          contactInfo: email,
          subject: subject || `Sharing Document: ${documentName}`,
          message: message || `Please find attached the document: ${documentName}`,
          documentIds: effectiveDocIds,
        });

        await documentsApi.recordShare(effectiveTargetId, {
          sharedVia: 'WhatsApp',
          recipientName: recipientName || 'Multiple',
          contactInfo: whatsapp,
          documentIds: effectiveDocIds,
        });

        const emailData = emailRes?.data || emailRes;
        if (emailData?.emailSent === false) {
          toast.error(`WhatsApp recorded, but email failed: ${emailData?.emailError || 'Failed to send via Resend'}`);
        } else {
          toast.success('Document shared via Email (Resend) and WhatsApp successfully!');
        }
      } else {
        const res: any = await documentsApi.recordShare(effectiveTargetId, {
          sharedVia: type === 'whatsapp' ? 'WhatsApp' : 'Email',
          recipientName: recipientName || 'Multiple',
          contactInfo: type === 'email' ? email : whatsapp,
          subject: subject || `Sharing Document: ${documentName}`,
          message: message || `Please find attached the document: ${documentName}`,
          documentIds: effectiveDocIds,
        });

        const data = res?.data || res;
        if (type === 'email') {
          if (data?.emailSent === false) {
            toast.error(`Share recorded, but email failed: ${data?.emailError || 'Failed to send via Resend'}`);
          } else {
            toast.success(`Email successfully sent to ${email} via Resend!`);
          }
        } else {
          toast.success(`Document shared via ${type} successfully!`);
        }
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to share document');
    } finally {
      setSubmitting(false);
    }
  };

  const isEmail = type === 'email' || type === 'both';
  const isWhatsapp = type === 'whatsapp' || type === 'both';

  const modalTitle =
    type === 'email' ? 'Share via Email' : type === 'whatsapp' ? 'Share via WhatsApp' : 'Share Options';

  const modalIcon =
    type === 'email' ? <Mail size={16} /> : type === 'whatsapp' ? <Send size={16} /> : <Share2 size={16} />;

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle="Secure direct document transmission"
      icon={modalIcon}
      maxWidth="md"
      bodyClassName="p-6 space-y-3.5"
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
            form="share-doc-form"
            disabled={submitting}
            className="flex-1 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Sharing...' : 'Share Now'}
          </button>
        </div>
      }
    >
      <form id="share-doc-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
            Document
          </label>
          <div className="p-3 bg-muted/40 border border-border/60 rounded-xl text-xs text-foreground font-medium flex items-center gap-2">
            <span className="text-sm">📄</span>
            <span className="truncate">{documentName}</span>
          </div>
        </div>

        {isEmail && (
          <>
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Recipient Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full p-2.5 border border-input bg-background rounded-xl text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                placeholder="Enter recipient name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-input bg-background rounded-xl text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                placeholder="recipient@example.com"
              />
            </div>
          </>
        )}

        {isWhatsapp && (
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">WhatsApp Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-input bg-muted rounded-l-xl text-muted-foreground text-xs font-medium">
                +91
              </span>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="flex-1 w-full p-2.5 border border-input bg-background rounded-r-xl text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                placeholder="98765 43210"
              />
            </div>
          </div>
        )}

        {(type === 'both' || type === 'email') && (
          <>
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Subject</label>
              <input
                type="text"
                required={type === 'email' || type === 'both'}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 border border-input bg-background rounded-xl text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Message</label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2.5 border border-input bg-background rounded-xl text-xs focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                placeholder="Add a message..."
              />
            </div>
          </>
        )}
      </form>
    </MacModal>
  );
};

export default ShareModal;
