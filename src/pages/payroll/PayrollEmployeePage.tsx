import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link, useNavigate, useParams } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const NONE = "__none__";

function toId(v: string): number | null {
  if (!v || v === NONE) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function OrgSelect({
  label,
  value,
  onChange,
  options,
  labelKey,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: any[];
  labelKey: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Not set —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o[labelKey] ?? o.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PayrollEmployeePage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const [employeeNo, setEmployeeNo] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [arabicName, setArabicName] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [probationEndDate, setProbationEndDate] = useState("");
  const [status, setStatus] = useState("active");
  const [contractType, setContractType] = useState("");
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [workforceGroupId, setWorkforceGroupId] = useState("");
  const [employmentCategoryId, setEmploymentCategoryId] = useState("");
  const [payrollGroupId, setPayrollGroupId] = useState("");
  const [visaSponsorCompanyId, setVisaSponsorCompanyId] = useState("");
  const [workLocationId, setWorkLocationId] = useState("");
  const [uaeNational, setUaeNational] = useState(false);
  const [gpssaEligible, setGpssaEligible] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [salaryCardNo, setSalaryCardNo] = useState("");
  const [labourCardNo, setLabourCardNo] = useState("");
  const [molPersonalId, setMolPersonalId] = useState("");
  const [wpsEnabled, setWpsEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  const [history, setHistory] = useState<any[]>([]);

  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [workforces, setWorkforces] = useState<any[]>([]);
  const [employmentCategories, setEmploymentCategories] = useState<any[]>([]);
  const [payrollGroups, setPayrollGroups] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [workLocations, setWorkLocations] = useState<any[]>([]);

  useEffect(() => {
    const masters = Promise.all([
      payrollAPI.organization.list("branches", { limit: 200 }),
      payrollAPI.organization.list("departments", { limit: 200 }),
      payrollAPI.organization.list("designations", { limit: 200 }),
      payrollAPI.organization.list("grades", { limit: 200 }),
      payrollAPI.organization.list("levels", { limit: 200 }),
      payrollAPI.organization.list("workforce-groups", { limit: 200 }),
      payrollAPI.organization.list("employment-categories", { limit: 200 }),
      payrollAPI.organization.list("payroll-groups", { limit: 200 }),
      payrollAPI.organization.list("visa-sponsors", { limit: 200 }),
      payrollAPI.organization.list("work-locations", { limit: 200 }),
    ]).then(([b, d, des, g, l, w, ec, pg, vs, wl]) => {
      setBranches(b.data?.data ?? []);
      setDepartments(d.data?.data ?? []);
      setDesignations(des.data?.data ?? []);
      setGrades(g.data?.data ?? []);
      setLevels(l.data?.data ?? []);
      setWorkforces(w.data?.data ?? []);
      setEmploymentCategories(ec.data?.data ?? []);
      setPayrollGroups(pg.data?.data ?? []);
      setSponsors(vs.data?.data ?? []);
      setWorkLocations(wl.data?.data ?? []);
    });
    masters.catch(() => toast.error("Failed to load organization masters"));
  }, []);

  useEffect(() => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      payrollAPI.employees.getById(parseInt(id, 10)),
      payrollAPI.workspace.employee360(parseInt(id, 10)),
    ])
      .then(([empRes, bundleRes]) => {
        const e = empRes.data?.data;
        const bank = bundleRes.data?.data?.bank;
        setEmployeeNo(e.employeeNo ?? "");
        setEmployeeName(e.employeeName ?? "");
        setArabicName(e.arabicName ?? "");
        setNationality(e.nationality ?? "");
        setGender(e.gender ?? "");
        setJoiningDate(e.joiningDate ? String(e.joiningDate).slice(0, 10) : "");
        setProbationEndDate(e.probationEndDate ? String(e.probationEndDate).slice(0, 10) : "");
        setStatus(e.status ?? "active");
        setContractType(e.contractType ?? "");
        setBranchId(e.branchId ? String(e.branchId) : "");
        setDepartmentId(e.departmentId ? String(e.departmentId) : "");
        setDesignationId(e.designationId ? String(e.designationId) : "");
        setGradeId(e.gradeId ? String(e.gradeId) : "");
        setLevelId(e.levelId ? String(e.levelId) : "");
        setWorkforceGroupId(e.workforceGroupId ? String(e.workforceGroupId) : "");
        setEmploymentCategoryId(e.employmentCategoryId ? String(e.employmentCategoryId) : "");
        setPayrollGroupId(e.payrollGroupId ? String(e.payrollGroupId) : "");
        setVisaSponsorCompanyId(e.visaSponsorCompanyId ? String(e.visaSponsorCompanyId) : "");
        setWorkLocationId(e.workLocationId ? String(e.workLocationId) : "");
        setUaeNational(!!e.uaeNational);
        setGpssaEligible(!!e.gpssaEligible);
        setHistory(e.history || []);
        if (bank) {
          setBankName(bank.bankName ?? "");
          setAccountNumber(bank.accountNumber ?? "");
          setIban(bank.iban ?? "");
          setSwiftCode(bank.swiftCode ?? "");
          setBankCode(bank.bankCode ?? "");
          setSalaryCardNo(bank.salaryCardNo ?? "");
          setLabourCardNo(bank.labourCardNo ?? "");
          setMolPersonalId(bank.molPersonalId ?? "");
          setWpsEnabled(bank.wpsEnabled !== false);
          setPaymentMethod(bank.paymentMethod ?? "BANK_TRANSFER");
        }
      })
      .catch(() => toast.error("Failed to load employee"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const buildEmployeePayload = () => ({
    employeeNo,
    employeeName,
    arabicName: arabicName || null,
    nationality: nationality || null,
    gender: gender || null,
    joiningDate: joiningDate || null,
    probationEndDate: probationEndDate || null,
    status,
    contractType: contractType || null,
    branchId: toId(branchId),
    departmentId: toId(departmentId),
    designationId: toId(designationId),
    gradeId: toId(gradeId),
    levelId: toId(levelId),
    workforceGroupId: toId(workforceGroupId),
    employmentCategoryId: toId(employmentCategoryId),
    payrollGroupId: toId(payrollGroupId),
    visaSponsorCompanyId: toId(visaSponsorCompanyId),
    workLocationId: toId(workLocationId),
    uaeNational,
    gpssaEligible,
  });

  const saveBank = async (employeeId: number) => {
    const hasBank =
      bankName.trim() ||
      iban.trim() ||
      accountNumber.trim() ||
      labourCardNo.trim() ||
      molPersonalId.trim();
    if (!hasBank) return;
    await payrollAPI.wps.updateEmployeeBank(employeeId, {
      bank_name: bankName.trim() || null,
      account_number: accountNumber.trim() || null,
      iban: iban.trim() || null,
      swift_code: swiftCode.trim() || null,
      bank_code: bankCode.trim() || null,
      salary_card_no: salaryCardNo.trim() || null,
      labour_card_no: labourCardNo.trim() || null,
      mol_personal_id: molPersonalId.trim() || null,
      wps_enabled: wpsEnabled,
      payment_method: paymentMethod,
    });
  };

  const save = async () => {
    if (!employeeNo.trim() || !employeeName.trim()) {
      toast.error("Employee number and name are required");
      return;
    }
    setSaving(true);
    try {
      const payload = buildEmployeePayload();
      let employeeId: number;
      if (isNew) {
        const res = await payrollAPI.employees.create(payload);
        employeeId = res.data?.data?.id;
        toast.success("Employee created");
        await saveBank(employeeId);
        navigate(`/people/payroll/employees/${employeeId}/edit`);
      } else {
        employeeId = parseInt(id!, 10);
        await payrollAPI.employees.update(employeeId, payload);
        await saveBank(employeeId);
        toast.success("Saved");
      }
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const recordPromotion = async () => {
    if (isNew) return;
    try {
      await payrollAPI.employees.addHistory(parseInt(id!, 10), {
        eventType: "PROMOTION",
        eventDate: new Date().toISOString().slice(0, 10),
        notes: "Promotion recorded",
      });
      toast.success("Promotion recorded");
      const res = await payrollAPI.employees.getById(parseInt(id!, 10));
      setHistory(res.data?.data?.history || []);
    } catch {
      toast.error("Failed to record promotion");
    }
  };

  if (loading) {
    return (
      <PayrollLegacyPage titleKey="payroll.pages.employee" description="Loading…" backHref="/people/payroll/employees">
        <p className="text-muted-foreground text-sm">Loading employee…</p>
      </PayrollLegacyPage>
    );
  }

  return (
    <PayrollLegacyPage
      {...(isNew
        ? { titleKey: "payroll.pages.newEmployee" }
        : employeeName
          ? { title: employeeName }
          : { titleKey: "payroll.pages.employee" })}
      description="Create or update employee master data, employment, and WPS bank details."
      backHref="/people/payroll/employees"
    >
      <div className="space-y-6 max-w-5xl">
        {!isNew && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/people/payroll/employees/${id}`}>View Employee 360</Link>
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Core employee identification</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Employee no. *</Label>
              <Input value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} />
            </div>
            <div>
              <Label>Name (English) *</Label>
              <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
            </div>
            <div>
              <Label>Name (Arabic)</Label>
              <Input value={arabicName} onChange={(e) => setArabicName(e.target.value)} dir="rtl" />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. UAE, India" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={gender || NONE} onValueChange={(v) => setGender(v === NONE ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Not set —</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Joining date</Label>
              <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
            <CardDescription>Organization structure and workforce classification</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OrgSelect label="Branch" value={branchId} onChange={setBranchId} options={branches} labelKey="branchName" />
            <OrgSelect
              label="Department"
              value={departmentId}
              onChange={setDepartmentId}
              options={departments}
              labelKey="departmentName"
            />
            <OrgSelect
              label="Designation"
              value={designationId}
              onChange={setDesignationId}
              options={designations}
              labelKey="designationName"
            />
            <OrgSelect label="Grade" value={gradeId} onChange={setGradeId} options={grades} labelKey="gradeName" />
            <OrgSelect label="Level" value={levelId} onChange={setLevelId} options={levels} labelKey="levelName" />
            <OrgSelect
              label="Workforce group"
              value={workforceGroupId}
              onChange={setWorkforceGroupId}
              options={workforces}
              labelKey="groupName"
            />
            <OrgSelect
              label="Employment category"
              value={employmentCategoryId}
              onChange={setEmploymentCategoryId}
              options={employmentCategories}
              labelKey="categoryName"
            />
            <OrgSelect
              label="Payroll group"
              value={payrollGroupId}
              onChange={setPayrollGroupId}
              options={payrollGroups}
              labelKey="groupName"
            />
            <OrgSelect
              label="Visa sponsor"
              value={visaSponsorCompanyId}
              onChange={setVisaSponsorCompanyId}
              options={sponsors}
              labelKey="sponsorName"
            />
            <OrgSelect
              label="Work location"
              value={workLocationId}
              onChange={setWorkLocationId}
              options={workLocations}
              labelKey="locationName"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract & status</CardTitle>
            <CardDescription>Employment terms and UAE payroll flags</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contract type</Label>
              <Select value={contractType || NONE} onValueChange={(v) => setContractType(v === NONE ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Not set —</SelectItem>
                  <SelectItem value="LIMITED">Limited</SelectItem>
                  <SelectItem value="UNLIMITED">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Probation end date</Label>
              <Input type="date" value={probationEndDate} onChange={(e) => setProbationEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-4 justify-center">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="uaeNational">UAE national</Label>
                <Switch id="uaeNational" checked={uaeNational} onCheckedChange={setUaeNational} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="gpssaEligible">GPSSA eligible</Label>
                <Switch id="gpssaEligible" checked={gpssaEligible} onCheckedChange={setGpssaEligible} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WPS & bank</CardTitle>
            <CardDescription>Primary salary payment account for WPS export</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bank name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="AE…" />
            </div>
            <div>
              <Label>Account number</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div>
              <Label>SWIFT code</Label>
              <Input value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} />
            </div>
            <div>
              <Label>Bank code</Label>
              <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="SALARY_CARD">Salary card</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salary card no.</Label>
              <Input value={salaryCardNo} onChange={(e) => setSalaryCardNo(e.target.value)} />
            </div>
            <div>
              <Label>Labour card no.</Label>
              <Input value={labourCardNo} onChange={(e) => setLabourCardNo(e.target.value)} />
            </div>
            <div>
              <Label>MOL personal ID</Label>
              <Input value={molPersonalId} onChange={(e) => setMolPersonalId(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-4 md:col-span-2">
              <Label htmlFor="wpsEnabled">WPS enabled</Label>
              <Switch id="wpsEnabled" checked={wpsEnabled} onCheckedChange={setWpsEnabled} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save employee"}
          </Button>
          {!isNew && (
            <Button variant="outline" asChild>
              <Link to={`/people/payroll/employees/${id}`}>Cancel</Link>
            </Button>
          )}
        </div>

        {!isNew && (
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>History</CardTitle>
              <Button size="sm" variant="outline" onClick={recordPromotion}>
                Record promotion
              </Button>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm">No history yet.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="border-b pb-2">
                      <span className="font-medium">{h.eventType}</span> — {String(h.eventDate).slice(0, 10)}
                      {h.notes && <span className="text-muted-foreground"> — {h.notes}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PayrollLegacyPage>
  );
}
