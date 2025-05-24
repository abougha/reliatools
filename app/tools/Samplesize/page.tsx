/* app/tools/SampleSize/page.tsx */
"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { Calculator, CheckCircle } from 'lucide-react';

function binomialCoefficient(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 1; i <= k; ++i) {
    res *= (n - i + 1);
    res /= i;
  }
  return res;
}

function cumulativeBinomial(f: number, n: number, R: number): number {
  let sum = 0;
  for (let i = 0; i <= f; i++) {
    sum += binomialCoefficient(n, i) * Math.pow(1 - R, i) * Math.pow(R, n - i);
  }
  return 1 - sum;
}

export default function SampleSizeCalculator() {
  const [failures, setFailures] = useState("0");
  const [confidence, setConfidence] = useState("95");
  const [reliability, setReliability] = useState("90");
  const [sampleSize, setSampleSize] = useState("30");
  const [solveFor, setSolveFor] = useState("n");
  const [result, setResult] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleCalculate = () => {
    const f = parseInt(failures);
    const CL = parseFloat(confidence) / 100;
    const R = parseFloat(reliability) / 100;
    const nInit = parseInt(sampleSize);

    let calculatedSampleSize = nInit;

    if (solveFor === "n") {
      for (let n = 1; n < 1000; n++) {
        if (cumulativeBinomial(f, n, R) >= CL) {
          setSampleSize(n.toString());
          setResult(`Required sample size: ${n}`);
          calculatedSampleSize = n;
          break;
        }
      }
    } else if (solveFor === "CL") {
      const CL_calc = cumulativeBinomial(f, nInit, R);
      setConfidence((CL_calc * 100).toFixed(2));
      setResult(`Achieved confidence level: ${(CL_calc * 100).toFixed(2)}%`);
    } else if (solveFor === "R") {
      let Rtest = 0.01;
      while (Rtest < 0.999) {
        if (cumulativeBinomial(f, nInit, Rtest) >= CL) {
          setReliability((Rtest * 100).toFixed(2));
          setResult(`Minimum reliability: ${(Rtest * 100).toFixed(2)}%`);
          break;
        }
        Rtest += 0.001;
      }
    } else if (solveFor === "f") {
      for (let fail = 0; fail < nInit; fail++) {
        if (cumulativeBinomial(fail, nInit, R) >= CL) {
          setFailures(fail.toString());
          setResult(`Maximum allowed failures: ${fail}`);
          break;
        }
      }
    }

    const data = [];
    const start = Math.max(1, Math.floor(calculatedSampleSize * 0.8));
    const end = Math.ceil(calculatedSampleSize * 1.2);

    for (let n = start; n <= end; n++) {
      const cl = cumulativeBinomial(f, n, R);
      data.push({ n, cl: +(cl * 100).toFixed(2) });
    }
    setChartData(data);
  };

  const downloadCSV = () => {
    const csvRows = ["Sample Size,Confidence Level (%)"];
    chartData.forEach(row => {
      csvRows.push(`${row.n},${row.cl}`);
    });
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'confidence_vs_sample_size.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Calculator className="w-6 h-6 text-blue-600" />
        Sample Size Calculator (Binomial Distribution)
      </h1>

      <section className="bg-gray-100 p-4 rounded mb-6 text-sm text-gray-800 border border-gray-200">
        <h2 className="font-semibold text-base mb-2 text-blue-700">Binomial Distribution Formula</h2>
        <div className="text-center text-base mb-2">
          <InlineMath math={'1 - \\sum_{i=0}^{f} \\binom{n}{i} (1 - R)^i R^{n - i} \\geq CL'} />
        </div>
        <p className="mt-2">
          <strong>Where:</strong><br />
          <strong>n</strong> = Sample size<br />
          <strong>f</strong> = Allowed number of failures<br />
          <strong>R</strong> = Reliability (probability of success)<br />
          <strong>CL</strong> = Confidence level (target probability)
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {[{
          label: "Failures",
          value: failures,
          onChange: setFailures,
          id: "f",
        }, {
          label: "Confidence Level (%)",
          value: confidence,
          onChange: setConfidence,
          id: "CL",
        }, {
          label: "Reliability (%)",
          value: reliability,
          onChange: setReliability,
          id: "R",
        }, {
          label: "Sample Size",
          value: sampleSize,
          onChange: setSampleSize,
          id: "n",
        }].map(field => (
          <div key={field.id}>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name="solveFor"
                value={field.id}
                checked={solveFor === field.id}
                onChange={() => setSolveFor(field.id)}
              />
              {field.label}
            </label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              disabled={solveFor === field.id}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleCalculate}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Calculate
      </button>

      {result && (
        <div className="mt-6 border rounded p-4 text-center text-lg font-semibold bg-gray-50 text-green-700 flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {result}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2 text-blue-700">Confidence vs. Sample Size</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="n" label={{ value: 'Sample Size (n)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Confidence (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="cl" stroke="#000" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          <button
            onClick={downloadCSV}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}
