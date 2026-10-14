import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/db/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
interface DartQuestion {
  id: string;
  title: string;
  problemStatement?: string;
  description?: string;
}

export default function DartPracticePage() {
  const [questions, setQuestions] = useState<DartQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const qRef = collection(db, 'dart_questions');
        const qSnap = await getDocs(qRef);
        const list: DartQuestion[] = [];
        qSnap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setQuestions(list);
      } catch (e) {
        console.error('Failed to load Dart questions', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-white">Dart Practice Problems</h1>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" /> Loading questions...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {questions.map((q) => (
              <Card key={q.id} className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg truncate">{q.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  <p className="text-slate-400 text-sm line-clamp-3">{q.problemStatement || q.description || ''}</p>
                  <Button asChild className="mt-2 w-full bg-blue-600 hover:bg-blue-700">
                    <Link to={`/dart/practice/${q.id}`}>Solve</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
