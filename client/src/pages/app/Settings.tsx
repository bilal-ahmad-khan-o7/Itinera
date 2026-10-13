import { toast } from 'sonner';
import { Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/app/common';
import { useSettings, type AgencyProfile } from '@/store/settings';
import { useCrm } from '@/store/crm';

const FIELDS: { key: keyof AgencyProfile; label: string; hint?: string }[] = [
  { key: 'name', label: 'Agency name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'gstin', label: 'GSTIN', hint: 'Printed on quotations and tax invoices' },
  { key: 'state', label: 'Registered state', hint: 'Clients in this state get CGST + SGST; others get IGST' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
];

export default function Settings() {
  const { agency, updateAgency, defaultMarkupB2C, defaultMarkupB2B, gstPct, updatePricing } = useSettings();
  const reset = useCrm((s) => s.reset);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Your agency profile appears on every PDF. Settings are stored in this browser." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Agency profile</CardTitle>
            <CardDescription>Used for document headers, footers and GST calculations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key} className="mb-1.5 block">
                  {f.label}
                </Label>
                <Input id={f.key} value={agency[f.key]} onChange={(e) => updateAgency({ [f.key]: e.target.value })} />
                {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label htmlFor="address" className="mb-1.5 block">
                Address
              </Label>
              <Textarea id="address" value={agency.address} onChange={(e) => updateAgency({ address: e.target.value })} className="min-h-16" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bank" className="mb-1.5 block">
                Bank details (printed on invoices)
              </Label>
              <Input id="bank" value={agency.bankDetails} onChange={(e) => updateAgency({ bankDetails: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing defaults</CardTitle>
              <CardDescription>Applied to new quotes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div>
                <Label htmlFor="b2c" className="mb-1.5 block">
                  B2C markup %
                </Label>
                <Input id="b2c" type="number" value={defaultMarkupB2C} onChange={(e) => updatePricing({ defaultMarkupB2C: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="b2b" className="mb-1.5 block">
                  B2B markup %
                </Label>
                <Input id="b2b" type="number" value={defaultMarkupB2B} onChange={(e) => updatePricing({ defaultMarkupB2B: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="gst" className="mb-1.5 block">
                  GST %
                </Label>
                <Input id="gst" type="number" value={gstPct} onChange={(e) => updatePricing({ gstPct: Number(e.target.value) })} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Data</CardTitle>
              <CardDescription>Leads, quotes and the shortlist live in this browser's local storage, so no account is needed for the demo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm('Delete all leads, quotes and shortlisted hotels from this browser?')) {
                    reset();
                    toast('Workspace data cleared');
                  }
                }}
              >
                <Trash /> Clear workspace data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
