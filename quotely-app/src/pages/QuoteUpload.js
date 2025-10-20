import { useState } from "react";

export default function QuoteUpload() {
  const [quotes, setQuotes] = useState([
    { supplier: "Supplier A", item: "Painting", price: 500 },
    { supplier: "Supplier B", item: "Painting", price: 450 },
  ]);

  return (
    <div className="max-w-3xl mx-auto p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">Upload Quotes</h2>
      <div className="mb-4">
        <input type="file" className="border p-2 rounded" />
        <button className="ml-2 bg-blue-500 text-white p-2 rounded">
          Upload
        </button>
      </div>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Supplier</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">Price</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, idx) => (
            <tr key={idx}>
              <td className="border p-2">{q.supplier}</td>
              <td className="border p-2">{q.item}</td>
              <td className="border p-2">${q.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
