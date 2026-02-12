import { useState, useEffect } from "react";
import { serviceTemplatesAPI } from "@/services/api";
import type { ServiceTemplate } from "@/types/serviceTemplate";
import { toast } from "sonner";
import { Search, DollarSign, Tag, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ServiceTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ServiceTemplate) => void;
}

export default function ServiceTemplatePicker({ isOpen, onClose, onSelect }: ServiceTemplatePickerProps) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCategory, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await serviceTemplatesAPI.getAll({ activeOnly: 'true' });
      const fetchedTemplates = response.data?.data?.templates || [];
      setTemplates(fetchedTemplates);
      setFilteredTemplates(fetchedTemplates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load service templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await serviceTemplatesAPI.getCategories();
      const fetchedCategories = response.data?.data?.categories || [];
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Filter by category
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleSelectTemplate = (template: ServiceTemplate) => {
    onSelect(template);
    onClose();
    toast.success(`Added "${template.name}" from template`);
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Select Service Template
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose a predefined service template to quickly add to your lease or unit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading templates...</p>
                </div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">No templates found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-base">{template.name}</h3>
                        {template.isSystem && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>

                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {Number(template.defaultAmount) > 0 
                            ? `AED ${Number(template.defaultAmount).toFixed(2)}`
                            : 'Variable'}
                        </Badge>

                        {template.isTaxable && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                            Taxable
                          </Badge>
                        )}

                        <Badge variant="outline" className="text-xs">
                          {template.billingMethod === 'included_in_rental' 
                            ? 'Included' 
                            : 'Separate'}
                        </Badge>

                        {template.category && (
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        )}
                      </div>

                      {template.account ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Account: {template.account.accountCode} - {template.account.accountName}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 mt-2">
                          No account linked
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
