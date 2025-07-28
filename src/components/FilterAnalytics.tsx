import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  company_id: string;
}

interface Store {
  id: string;
  name: string;
  brand_id: string | null;
  company_id: string;
}

interface FilterAnalyticsProps {
  companies: Company[];
  brands: Brand[];
  stores: Store[];
  selectedCompany: string;
  selectedBrand: string;
  selectedStore: string;
  onCompanyChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onStoreChange: (value: string) => void;
  onClearFilters: () => void;
  userRole: string;
}

export function FilterAnalytics({
  companies,
  brands,
  stores,
  selectedCompany,
  selectedBrand,
  selectedStore,
  onCompanyChange,
  onBrandChange,
  onStoreChange,
  onClearFilters,
  userRole
}: FilterAnalyticsProps) {
  const availableBrands = brands.filter(brand => 
    selectedCompany === 'all' || brand.company_id === selectedCompany
  );

  const availableStores = stores.filter(store => {
    if (selectedCompany !== 'all' && store.company_id !== selectedCompany) return false;
    if (selectedBrand !== 'all' && store.brand_id !== selectedBrand) return false;
    return true;
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          {userRole === 'admin' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Select value={selectedCompany} onValueChange={onCompanyChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(userRole === 'admin' || userRole === 'company_manager') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand</label>
              <Select value={selectedBrand} onValueChange={onBrandChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Store</label>
            <Select value={selectedStore} onValueChange={onStoreChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {availableStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}