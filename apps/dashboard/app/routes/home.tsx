import type { Route } from './+types/home';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Ownlane Dashboard' },
    { name: 'description', content: 'Ownlane creator dashboard.' },
  ];
}

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="max-w-lg text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">Ownlane</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Your dashboard is ready.</h1>
        <p className="mt-4 text-neutral-600">Your brand. Your audience. Your business.</p>
      </section>
    </main>
  );
}
