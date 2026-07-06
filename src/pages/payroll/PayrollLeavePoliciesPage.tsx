import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollLeavePoliciesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.leavePolicy.listTypes().then((r) => setTypes(r.data?.data ?? []));
    payrollAPI.leavePolicy.listPolicies().then((r) => setPolicies(r.data?.data ?? []));
  }, []);

  return (
    <PayrollLegacyPage titleKey="payroll.pages.leavePolicies" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leave types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.leaveCode}</TableCell>
                  <TableCell>{t.leaveName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Leave type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.policyCode}</TableCell>
                  <TableCell>{p.policyName}</TableCell>
                  <TableCell>{p.leaveType?.leaveName}</TableCell>
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
