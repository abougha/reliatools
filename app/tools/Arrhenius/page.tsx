'use client';

import { useState } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

export default function ArrheniusPage() {
  const [Ea, setEa] = useState('');       // Activation energy (eV)
  const [T1, setT1] = useState('');       // Use temperature (°C)
  const [T2, setT2] = useState('');       // Test temperature (°C)
  const [t1, setT1Time] = useState('');   // Time at T1 (hours)
  const [result, setResult] = useState<{ AF: string; t2: string } | null>(null);

  const calculate = () => {
    const k = 8.617e-5; // Boltzmann constant in eV/K
    const T1K = parseFloat(T1) + 273.15;
    const T2K = parseFloat(T2) + 273.15;
    const ea = parseFloat(Ea);
    const time = parseFloat(t1);

    if ([ea, T1K, T2K, time].some(Number.isNaN)) return;

    const AF = Math.exp((ea / k) * ((1 / T1K) - (1 / T2K)));
    const t2 = time / AF;

    setResult({
      AF: AF.toFixed(2),
      t2: t2.toFixed(2),
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Arrhenius Life Calculator</h1>
      <p className="mb-6 text-gray-700">
        The Arrhenius equation is a fundamental tool in reliability engineering, used to model the acceleration of aging and failure mechanisms with increased temperature. 
        This calculator helps estimate the Acceleration Factor (AF) and equivalent test time at elevated temperature based on known conditions.
      </p>

      <Card className="space-y-4 p-4">
        <CardContent className="space-y-4">
          <div>
            <label className="block font-medium">Activation Energy (eV)</label>
            <Input type="number" value={Ea} onChange={e => setEa(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium">Use Temperature T1 (°C)</label>
            <Input type="number" value={T1} onChange={e => setT1(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium">Test Temperature T2 (°C)</label>
            <Input type="number" value={T2} onChange={e => setT2(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium">Expected Time at T1 (hours)</label>
            <Input type="number" value={t1} onChange={e => setT1Time(e.target.value)} />
          </div>
          <Button className="w-full" onClick={calculate}>
            Calculate
          </Button>

          {result && (
            <div className="mt-4 bg-gray-100 p-4 rounded-xl shadow">
              <p><strong>Acceleration Factor (AF):</strong> {result.AF}</p>
              <p><strong>Equivalent Time at T2:</strong> {result.t2} hours</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
