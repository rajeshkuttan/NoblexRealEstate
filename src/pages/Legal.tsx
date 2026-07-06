import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { 
  Scale, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  CheckCircle2, 
  XCircle,
  Clock,
  AlertCircle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { legalCasesAPI, propertiesAPI, tenantsAPI, unitsAPI } from "@/services/api";
import { ListPagination } from "@/components/common/ListPagination";
import { format } from "date-fns";
import LegalForm from "@/components/legal/LegalForm";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from 'xlsx';
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function Legal() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("All");
  const [selectedPropertyId, setSelectedPropertyId] = useState("All");
  const [selectedUnitId, setSelectedUnitId] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState("All");
  const [tenantOptions, setTenantOptions] = useState<any[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<any[]>([]);
  const [unitOptions, setUnitOptions] = useState<any[]>([]);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const response = await legalCasesAPI.getAll({
        page,
        limit: itemsPerPage,
        search: searchTerm.trim() || undefined,
        tenantId: selectedTenantId !== "All" ? selectedTenantId : undefined,
        propertyId: selectedPropertyId !== "All" ? selectedPropertyId : undefined,
        unitId: selectedUnitId !== "All" ? selectedUnitId : undefined,
        status: selectedStatus !== "All" ? selectedStatus : undefined,
        approvalStatus: selectedApprovalStatus !== "All" ? selectedApprovalStatus : undefined,
        _t: Date.now(),
      });
      if (response.data.success) {
        const data = response.data.data || {};
        const list = data.cases || [];
        const pagination = data.pagination || {};
        setCases(Array.isArray(list) ? list : []);
        setTotalPages(pagination.totalPages || pagination.pages || 1);
        setTotalItems(pagination.totalItems || pagination.total || 0);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch legal cases",
        variant: "destructive",
      });
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [
    itemsPerPage,
    page,
    searchTerm,
    selectedApprovalStatus,
    selectedPropertyId,
    selectedStatus,
    selectedTenantId,
    selectedUnitId,
    toast,
  ]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedTenantId, selectedPropertyId, selectedUnitId, selectedStatus, selectedApprovalStatus]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [tenantsResponse, propertiesResponse, unitsResponse] = await Promise.all([
          tenantsAPI.getAll({ limit: 200, page: 1 }, true),
          propertiesAPI.getAll({ limit: 200, page: 1 }),
          unitsAPI.getAll({ limit: 500 }),
        ]);

        const tenantsData =
          tenantsResponse.data?.data?.tenants ||
          tenantsResponse.data?.tenants ||
          [];
        const propertiesData = propertiesResponse.data?.properties || [];
        const unitsData = unitsResponse.data?.units || [];

        setTenantOptions(Array.isArray(tenantsData) ? tenantsData : []);
        setPropertyOptions(Array.isArray(propertiesData) ? propertiesData : []);
        setUnitOptions(Array.isArray(unitsData) ? unitsData : []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load legal filter options",
          variant: "destructive",
        });
      }
    };

    fetchFilterOptions();
  }, [toast]);

  useEffect(() => {
    if (selectedPropertyId === "All") {
      return;
    }

    const selectedUnitStillMatches = unitOptions.some(
      (unit) =>
        String(unit.id) === selectedUnitId &&
        String(unit.propertyId || unit.property?.id || "") === selectedPropertyId
    );

    if (selectedUnitId !== "All" && !selectedUnitStillMatches) {
      setSelectedUnitId("All");
    }
  }, [selectedPropertyId, selectedUnitId, unitOptions]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (id === 'new') {
      setShowForm(true);
      setSelectedCaseId(null);
      setIsReadOnlyView(false);
    } else if (id) {
      setSelectedCaseId(parseInt(id));
      setShowForm(true);
      setIsReadOnlyView(mode === "view");
    } else {
      setShowForm(false);
      setSelectedCaseId(null);
      setIsReadOnlyView(false);
    }
  }, [id, searchParams]);

  const handleCreateNew = () => {
    navigate("/legal/new");
  };

  const handleEdit = (id: number) => {
    navigate(`/legal/${id}`);
  };

  const handleViewDetails = (id: number) => {
    navigate(`/legal/${id}?mode=view`);
  };

  const handleFormClose = () => {
    navigate("/legal");
    fetchCases();
  };

  const handleExportRow = (c: any) => {
    try {
      const exportData = [{
        'Case Number': c.caseNumber,
        'Description': c.description,
        'Lease Number': c.lease?.leaseNumber,
        'Unit Number': c.unit?.unitNumber,
        'Tenant Name': c.tenant?.name,
        'Start Date': format(new Date(c.startDate), "dd MMM yyyy"),
        'Expected Closure': c.expectedClosureDate ? format(new Date(c.expectedClosureDate), "dd MMM yyyy") : 'N/A',
        'Status': c.status,
        'Approved': c.isApproved ? 'Yes' : 'No',
        'Remarks': c.remarks || ''
      }];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Legal Case");
      XLSX.writeFile(wb, `legal_case_${c.caseNumber}.xlsx`);
      toast({
        title: "Exported",
        description: "Case details exported to Excel successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export case details",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'dispute':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Dispute</Badge>;
      case 'npa':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">NPA</Badge>;
      case 'case':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ongoing Case</Badge>;
      case 'available':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Available</Badge>;
      case 'case_closed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Case Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredUnitOptions = unitOptions.filter((unit) => {
    if (selectedPropertyId === "All") return true;
    return String(unit.propertyId || unit.property?.id || "") === selectedPropertyId;
  });

  const clearFilters = () => {
    setSelectedTenantId("All");
    setSelectedPropertyId("All");
    setSelectedUnitId("All");
    setSelectedStatus("All");
    setSelectedApprovalStatus("All");
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleFormClose} className="p-0 h-auto hover:bg-transparent">
              <Scale className="h-8 w-8 text-primary" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {selectedCaseId ? (isReadOnlyView ? "Legal Case Details" : "Edit Legal Case") : "New Legal Case"}
              </h1>
              <p className="text-muted-foreground">
                {selectedCaseId
                  ? (isReadOnlyView ? "View legal matter information" : "Update existing legal matter")
                  : "Register a new legal dispute or case"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <LegalForm
            caseId={selectedCaseId}
            onClose={handleFormClose}
            onSuccess={fetchCases}
            readOnly={isReadOnlyView}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 uiux-page-enter">
      <div className="uiux-page-header flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="uiux-page-title">{t("legal.title")}</h1>
            <p className="uiux-page-subtitle font-medium">{t("legal.subtitle")}</p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
          <Plus className="mr-2 h-4 w-4" /> New Legal Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Disputes</p>
            <p className="text-2xl font-bold">{cases.filter(c => c.status === 'dispute').length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Active Cases</p>
            <p className="text-2xl font-bold">{cases.filter(c => c.status === 'case').length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Pending NPA</p>
            <p className="text-2xl font-bold">{cases.filter(c => c.status === 'npa').length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Closed Cases</p>
            <p className="text-2xl font-bold">{cases.filter(c => c.status === 'case_closed').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases, leases, tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters((value) => !value)}>
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="border-b bg-background/80 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SearchableSelect
                value={selectedTenantId}
                onValueChange={setSelectedTenantId}
                placeholder="Filter by tenant"
                searchPlaceholder="Search tenants..."
                emptyMessage="No tenant found"
                options={[
                  { value: "All", label: "All Tenants" },
                  ...tenantOptions.map((tenant) => ({
                    value: String(tenant.id),
                    label: tenant.name,
                  })),
                ]}
              />
              <SearchableSelect
                value={selectedPropertyId}
                onValueChange={setSelectedPropertyId}
                placeholder="Filter by property"
                searchPlaceholder="Search properties..."
                emptyMessage="No property found"
                options={[
                  { value: "All", label: "All Properties" },
                  ...propertyOptions.map((property) => ({
                    value: String(property.id),
                    label: property.title || property.name || `Property ${property.id}`,
                  })),
                ]}
              />
              <SearchableSelect
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                placeholder="Filter by unit"
                searchPlaceholder="Search units..."
                emptyMessage="No unit found"
                options={[
                  { value: "All", label: "All Units" },
                  ...filteredUnitOptions.map((unit) => ({
                    value: String(unit.id),
                    label: unit.unitNumber || unit.unit_number || `Unit ${unit.id}`,
                  })),
                ]}
              />
              <SearchableSelect
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                placeholder="Filter by status"
                searchPlaceholder="Search statuses..."
                emptyMessage="No status found"
                options={[
                  { value: "All", label: "All Statuses" },
                  { value: "dispute", label: "Dispute" },
                  { value: "npa", label: "NPA" },
                  { value: "case", label: "Ongoing Case" },
                  { value: "available", label: "Available" },
                  { value: "case_closed", label: "Case Closed" },
                ]}
              />
              <SearchableSelect
                value={selectedApprovalStatus}
                onValueChange={setSelectedApprovalStatus}
                placeholder="Filter by approval"
                searchPlaceholder="Search approval status..."
                emptyMessage="No approval status found"
                options={[
                  { value: "All", label: "All Approval States" },
                  { value: "approved", label: "Approved" },
                  { value: "pending", label: "Pending Approval" },
                ]}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold px-6 py-4">Case Details</TableHead>
                <TableHead className="font-semibold px-6 py-4">Contract / Unit</TableHead>
                <TableHead className="font-semibold px-6 py-4">Tenant</TableHead>
                <TableHead className="font-semibold px-6 py-4">Dates</TableHead>
                <TableHead className="font-semibold px-6 py-4">Status</TableHead>
                <TableHead className="font-semibold text-right px-6 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground font-medium">Loading legal cases...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                    No legal cases found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{c.caseNumber}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{c.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{c.lease?.leaseNumber}</span>
                        <span className="text-xs text-muted-foreground font-medium">Unit: {c.unit?.unitNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="font-medium">{c.tenant?.name}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">Start: {format(new Date(c.startDate), "dd MMM yyyy")}</span>
                        </div>
                        {c.expectedClosureDate && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Exp: {format(new Date(c.expectedClosureDate), "dd MMM yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {getStatusBadge(c.status)}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(c.id)} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          {c.status !== 'case_closed' && (
                            <DropdownMenuItem onClick={() => handleEdit(c.id)} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit Record
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleExportRow(c)} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4" /> Export Case
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!loading && totalItems > 0 && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          itemLabel="legal cases"
          onPageChange={setPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setPage(1);
          }}
          disabled={loading}
          shellClassName="mt-0"
        />
      )}
    </div>
  );
}
