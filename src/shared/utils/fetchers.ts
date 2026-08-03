import { supabase } from '@/core/supabase';

export async function uploadFile({
    file,
    folderId,
    subFolder,
    uploadType = 'upload',
    email,
    emailSubject,
    emailBody,
}: {
    file: File;
    folderId: string;
    subFolder?: string;
    uploadType?: 'upload' | 'email';
    email?: string;
    emailSubject?: string;
    emailBody?: string;
}): Promise<string> {
    void uploadType;
    void email;
    void emailSubject;
    void emailBody;

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${safeName}`;
    const storagePath = subFolder ? `${subFolder}/${fileName}` : fileName;

    const bucketName = folderId;

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
        });

    if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Failed to upload file to Supabase: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
        throw new Error('Failed to retrieve public URL from Supabase Storage');
    }

    return urlData.publicUrl;
}
