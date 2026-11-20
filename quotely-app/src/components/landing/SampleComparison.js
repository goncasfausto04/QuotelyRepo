// Static example of the comparison table for the landing page.

const ROWS = [
  ["Total incl. shipping", ["€4,310", "€3,980", "€4,650"], 1],
  ["Delivery time", ["12 days", "21 days", "9 days"], 2],
  ["Warranty", ["1 year", "2 years", "1 year"], 1],
];
const SUPPLIERS = ["Têxteis Norte", "Lisboa Print Co.", "EuroMerch"];

export default function SampleComparison() {
  return (
    <div className="card overflow-hidden text-left shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex justify-between">
        <span>500 organic cotton t-shirts, printed logo</span>
        <span>3 quotes · EUR</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="px-4 py-2" />
            {SUPPLIERS.map((s) => (
              <th key={s} className="px-4 py-2 font-semibold text-gray-900 dark:text-white">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 num">
          {ROWS.map(([label, values, best]) => (
            <tr key={label}>
              <th className="px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">{label}</th>
              {values.map((v, i) => (
                <td key={i} className={`px-4 py-2.5 ${i === best ? "bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 font-medium" : ""}`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
