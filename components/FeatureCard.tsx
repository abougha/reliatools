// components/FeatureCard.tsx
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white p-6 rounded-md shadow text-left">
      <h3 className="text-xl font-semibold mb-2">
        <span className="mr-2">{icon}</span>
        {title}
      </h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
