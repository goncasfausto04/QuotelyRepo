import { useState } from "react";

export default function QuoteUpload() {

  return (
    <div className="max-w-3xl mx-auto p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">Upload Quotes</h2>
      <div className="mb-4">
        <input type="file" className="border p-2 rounded" />
        <button className="ml-2 bg-blue-500 text-white p-2 rounded">
          Upload
        </button>
      </div>
    </div>
  );
}
