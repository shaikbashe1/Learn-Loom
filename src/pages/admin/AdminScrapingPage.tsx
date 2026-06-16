import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function AdminScrapingPage() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const handleImport = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    
    try {
      // Simulate backend pipeline delay
      toast.info('Initiating scrape...', { description: 'Crawling sources and humanizing content...' });
      await new Promise(r => setTimeout(r, 2000));
      
      const urls = urlInput.split('\n').filter(u => u.trim());
      let generatedCount = 0;
      
      for (const url of urls) {
        const { error } = await supabase.from('scraping_jobs').insert({
          url: url.trim(),
          status: 'pending',
          created_by: profile?.id
        });
        
        if (error) {
          console.error(error);
          toast.error(`Failed to queue job for ${url}`);
        } else {
          generatedCount++;
        }
      }
      
      if (generatedCount > 0) {
        toast.success('Pipeline Queued', { description: `Successfully added ${generatedCount} URLs to the scraping queue.` });
        setUrlInput('');
      }
      
    } catch (err) {
      toast.error('Pipeline Error', { description: 'Could not complete the generation process.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-xl space-y-xl max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-display-sm text-on-surface mb-2">Scraping Engine & Auto-Import</h1>
        <p className="text-body-lg text-on-surface-variant">Automated course generation pipeline. Paste URLs of approved educational sources below.</p>
      </div>

      <Card className="bg-surface border-outline-variant/60 shadow-sm rounded-xl">
        <CardHeader className="border-b border-outline-variant/20 pb-4">
          <CardTitle className="font-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">spider</span>
            Trigger Crawl Job
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col gap-4">
          <p className="text-body-sm text-on-surface-variant">Enter URLs to scrape (one per line). The engine will crawl, extract facts, humanize the content using AI, run originality checks, and push the generated course as a draft.</p>
          <textarea
            className="w-full bg-surface-container-low text-on-surface border border-outline-variant/60 rounded-lg p-4 font-body-md min-h-[150px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
            placeholder="https://example-edu.com/java-programming&#10;https://example-edu.com/algorithms-data-structures"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={loading || !urlInput.trim()} className="font-label-md flex items-center gap-2">
              {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : <span className="material-symbols-outlined text-[18px]">play_arrow</span>}
              Start Generation Pipeline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
