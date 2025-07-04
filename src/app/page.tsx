import SearchForm from '@/component/SearchForm';
import { Suspense } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen pt-16 p-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center" >
        AIESEC Directory
      </h1>
      <Suspense fallback={<div>Loading form...</div>}>
        <SearchForm />
      </Suspense>
    </div>
  );
}