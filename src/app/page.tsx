import SearchForm from '@/component/SearchForm';

export default function Home() {
  return (
    <div className="min-h-screen pt-16 p-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center" >
        AIESEC Directory
      </h1>
      <SearchForm />
    </div>
  );
}