import React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Code2, BookOpen, LayoutDashboard, Terminal } from 'lucide-react';

export default function DartDashboardPage() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dart Programming Center</h1>
          <p className="text-slate-400">Master Dart programming with structured modules and hands-on coding practice.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-xl text-white">Learning Path</CardTitle>
              <CardDescription className="text-slate-400">
                10 structured modules from variables to advanced async programming.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link to="/dart/learn">Start Learning</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-xl text-white">Coding Practice</CardTitle>
              <CardDescription className="text-slate-400">
                Solve over 100+ algorithmic challenges specifically in Dart.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                <Link to="/dart/practice">Practice Now</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-xl text-white">Online Compiler</CardTitle>
              <CardDescription className="text-slate-400">
                Write, run, and test your Dart code instantly in the browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end">
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link to="/dart/compiler">Open Playground</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
