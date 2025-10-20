export default function ComparisonDashboard() {
  const quotes = [
    { supplier: "Supplier A", item: "Painting", price: 500 },
    { supplier: "Supplier B", item: "Painting", price: 450 },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">Comparison Dashboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Item</th>
              {quotes.map((q, idx) => (
                <th key={idx} className="border p-2">
                  {q.supplier}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">Painting</td>
              {quotes.map((q, idx) => (
                <td
                  key={idx}
                  className={`border p-2 ${
                    q.price === Math.min(...quotes.map((q) => q.price))
                      ? "bg-green-200"
                      : ""
                  }`}
                >
                  ${q.price}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
