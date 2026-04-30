import { useEffect, useState } from "react";
import { toast } from "sonner";
import { leasesAPI, propertiesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function BuildingAnnouncements() {
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [minDays, setMinDays] = useState("60");
  const [minTermDays, setMinTermDays] = useState("90");
  const [strictRenewal, setStrictRenewal] = useState(false);
  const [sendEmails, setSendEmails] = useState(false);
  const [maxSend, setMaxSend] = useState("50");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await propertiesAPI.getAll({ limit: 200 });
        const list = res.data?.properties ?? [];
        setProperties(Array.isArray(list) ? list : []);
      } catch {
        setProperties([]);
      }
    };
    load();
  }, []);

  const handleSend = async () => {
    if (!propertyId || !subject.trim() || !html.trim()) {
      toast.error("Choose a property, subject, and message body.");
      return;
    }
    try {
      setSending(true);
      const res = await leasesAPI.broadcastAnnouncement({
        propertyId: parseInt(propertyId, 10),
        subject: subject.trim(),
        html: html.trim(),
        minDaysEndDate: parseInt(minDays, 10) || 60,
        strictRenewalFilter: strictRenewal,
        minInitialTermDays: parseInt(minTermDays, 10) || 90,
        sendEmails,
        maxSend: parseInt(maxSend, 10) || 50,
      });
      toast.success(res.data?.message || "Announcement processed");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Request failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 uiux-page-enter max-w-2xl">
      <div className="uiux-page-header">
        <h1 className="uiux-page-title">Building announcements</h1>
        <p className="uiux-page-subtitle">
          Email-style notice to tenants on active leases for the selected building (see backend filter:
          end date at least N days ahead).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>Recipient count returns from the API after submit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.title || p.name || `Property ${p.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Minimum days remaining on lease term</Label>
            <Input value={minDays} onChange={(e) => setMinDays(e.target.value)} type="number" min={1} />
          </div>
          <div>
            <Label>Minimum original term (days, strict filter only)</Label>
            <Input value={minTermDays} onChange={(e) => setMinTermDays(e.target.value)} type="number" min={1} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="strictRenewal"
              checked={strictRenewal}
              onCheckedChange={(c) => setStrictRenewal(c === true)}
            />
            <Label htmlFor="strictRenewal" className="font-normal cursor-pointer">
              Exclude likely holdover without renewal path (auto-renewal, renewal terms, or long initial term)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sendEmails" checked={sendEmails} onCheckedChange={(c) => setSendEmails(c === true)} />
            <Label htmlFor="sendEmails" className="font-normal cursor-pointer">
              Actually send email (SMTP env required; rate-limited)
            </Label>
          </div>
          <div>
            <Label>Max emails per request (cap)</Label>
            <Input value={maxSend} onChange={(e) => setMaxSend(e.target.value)} type="number" min={1} max={200} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message (HTML/plain)</Label>
            <Textarea rows={8} value={html} onChange={(e) => setHtml(e.target.value)} />
          </div>
          <Button type="button" onClick={handleSend} disabled={sending}>
            {sending ? "Working…" : sendEmails ? "Send (capped)" : "Preview recipient count"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
