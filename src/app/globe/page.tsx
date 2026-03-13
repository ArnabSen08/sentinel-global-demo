import dynamic from 'next/dynamic'

const GlobeView = dynamic(() => import('@/components/globe-view'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black flex items-center justify-center text-primary"><p>Loading Globe...</p></div>,
})

export default function GlobePage() {
  return <GlobeView />
}
