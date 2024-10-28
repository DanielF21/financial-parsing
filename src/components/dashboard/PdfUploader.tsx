'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PDFUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
  
    setUploading(true);
    setError('');
    setSuccess('');
  
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData?.user?.id;

      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('PDF_Bucket')
        .upload(`${Date.now()}_${file.name}`, file, {
          contentType: 'application/pdf',
          metadata: {
            owner_id: userId
          }
        });
  
      if (uploadError) throw uploadError;

      const { data: insertData, error: insertError } = await supabase
        .from('pdfs')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_path: uploadData.path,
        })
        .select();
      if (insertError) throw insertError;

      setSuccess('PDF uploaded successfully');
      // Process the uploaded PDF
      const fileId = insertData[0].id;

      const response = await fetch(`/api/extract?fileId=${fileId}&userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to process PDF');
      }
      
      const data = await response.json();

      // Upload the CSV data to PDF_Bucket
      const csvFileName = `analysis_${fileId}.csv`;
      const { error: csvUploadError } = await supabase.storage
        .from('PDF_Bucket')
        .upload(`csv/${csvFileName}`, data.data.toString(), {
          contentType: 'text/csv',
          upsert: true
        });

      if (csvUploadError) throw csvUploadError;
      setSuccess('PDF uploaded, processed, and CSV generated successfully');
    } catch (error) {
      setError('Error uploading or processing file');
      console.error('Error:', error);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload PDF</CardTitle>
        <CardDescription>Select and upload your PDF document</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            type="file"
            onChange={handleFileChange}
            accept=".pdf"
            disabled={uploading}
          />
          {file && <p className="text-sm text-gray-500">Selected file: {file.name}</p>}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading and Processing...' : 'Upload PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}