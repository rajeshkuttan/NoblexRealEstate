import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.shift.listShifts().then((r) => setShifts(r.data?.data ?? []));
    payrollAPI.shift.listHolidayCalendars().then((r) => setCalendars(r.data?.data ?? []));
  }, []);

  return (
    <PayrollLegacyPage title="Shifts & calendars" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shift masters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.shiftCode}</TableCell>
                  <TableCell>{s.shiftName}</TableCell>
                  <TableCell>
                    {s.startTime} – {s.endTime}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Holiday calendars</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.calendarCode}</TableCell>
                  <TableCell>{c.calendarName}</TableCell>
                  <TableCell>{c.year}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
