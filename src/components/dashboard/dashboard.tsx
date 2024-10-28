'use client'; 

import { useState } from 'react';
import PdfUploader from '@/components/dashboard/PdfUploader';
import PdfList from '@/components/dashboard/PdfList';
import PdfViewer from '@/components/dashboard/PdfViewer'; 
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from '@supabase/supabase-js'; 
import CsvViewer from './CsvViewer';

interface DashboardProps {
  user: User; 
}

const Dashboard = ({ user }: DashboardProps) => {
    const [selectedPDFId, setSelectedPDFId] = useState<string | null>(null);

    return (
      <div className="container mx-auto p-4 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl font-bold">PDF Manager</CardTitle>
              <div className="text-sm">Welcome, {user.email}</div> 
            </div>
            <CardDescription>Upload PDFs and view extracted CSV data</CardDescription>
          </CardHeader>
        </Card>
        <div className="grid md:grid-cols-2 gap-8">
          <PdfUploader />
          <PdfList onSelectPDF={setSelectedPDFId} />
        </div>
      
        {selectedPDFId && (
          <div className="flex space-x-4">
            <div className="w-1/2">
              <PdfViewer pdfId={selectedPDFId} />
            </div>
            <div className="w-1/2">
              <CsvViewer pdfId={selectedPDFId} />
            </div>
          </div>
        )}
      </div>
  );
};

export default Dashboard;