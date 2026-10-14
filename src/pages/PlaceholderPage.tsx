export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <section className="placeholder-page">
    <span className="eyebrow">筹备中</span>
    <h1>{title}</h1>
    <p>{description}</p>
  </section>
}
