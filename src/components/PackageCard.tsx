interface Props {
  name: string;
  price: string;
  features: string[];
}

export default function PackageCard({ name, price, features }: Props) {
  return (
    <div className="bg-white shadow-md rounded-lg p-8 flex-1 min-w-[260px]">
      <h3 className="text-2xl font-bold mb-4 text-indigo-600">{name}</h3>
      <p className="text-4xl font-extrabold mb-6">{price}</p>
      <ul className="space-y-2 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 transition">
        Continue
      </button>
    </div>
  );
} 