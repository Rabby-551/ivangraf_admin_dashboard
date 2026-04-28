"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { DateFilter } from "@/components/dashboard/date-filter";
import { ExportDialog } from "@/components/dashboard/export-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { RowDetailsDialog } from "@/components/dashboard/row-details-dialog";
import { TableFooter } from "@/components/dashboard/table-footer";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";
import { useConnectionSelection } from "@/components/dashboard/use-connection-selection";
import { usePagination } from "@/components/dashboard/use-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRevenueByTaxGroup, type RevenueTaxGroupItem } from "@/lib/api";
import { buildDateFilterParams, createDateFilterValue } from "@/lib/date-filter";
import { getErrorMessage } from "@/lib/error";
import { formatCurrency } from "@/lib/format";

const ITEMS_PER_PAGE = 12;

export default function RevenuePerTaxGroupPage() {
  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState(() => createDateFilterValue("today"));
  const [exportOpen, setExportOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<RevenueTaxGroupItem | null>(null);
  const { activeConnectionId, isConnectionReady } = useConnectionSelection();

  const queryParams = React.useMemo(() => buildDateFilterParams(dateFilter), [dateFilter]);

  const taxGroupQuery = useQuery({
    queryKey: ["dashboard", "revenue-tax-group", activeConnectionId, queryParams],
    queryFn: () => getRevenueByTaxGroup(queryParams, activeConnectionId),
    enabled: isConnectionReady && Boolean(activeConnectionId),
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    if (!taxGroupQuery.error) return;
    toast.error(getErrorMessage(taxGroupQuery.error, "Failed to load tax group revenue"));
  }, [taxGroupQuery.error]);

  const filteredRows = React.useMemo(() => {
    const rows = taxGroupQuery.data?.data || [];
    if (!search.trim()) return rows;

    const term = search.toLowerCase();
    return rows.filter((item) => item.taxGroup.toLowerCase().includes(term));
  }, [taxGroupQuery.data?.data, search]);

  const totalTaxAmount = React.useMemo(
    () => filteredRows.reduce((sum, item) => sum + item.taxAmount, 0),
    [filteredRows]
  );
  const isRefreshingTaxGroup = taxGroupQuery.isFetching && Boolean(taxGroupQuery.data);

  const { page, setPage, totalPages, totalItems, items } = usePagination(filteredRows, ITEMS_PER_PAGE);

  React.useEffect(() => {
    setPage(1);
  }, [dateFilter, search, setPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue per tax group"
        description="See revenue information grouped by tax tags and tax amount."
        actions={
          <>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <Button variant="soft" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </>
        }
      />

      <Card className="p-4">
        {!isConnectionReady || (taxGroupQuery.isLoading && !taxGroupQuery.data) ? (
          <TableSkeleton headers={["Name of tax group", "Tax base", "Total amount of tax"]} rows={ITEMS_PER_PAGE} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name of tax group</TableHead>
                <TableHead>Tax base</TableHead>
                <TableHead className="text-right">Total amount of tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={`${item.taxGroup}-${index}`} className="cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <TableCell className="font-medium">{item.taxGroup}</TableCell>
                  <TableCell>{formatCurrency(item.total)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.taxAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <TableFooter
          search={search}
          onSearchChange={setSearch}
          isRefreshing={isRefreshingTaxGroup}
          totalLabel="Total amount of tax"
          totalValue={formatCurrency(totalTaxAmount)}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
        />
      </Card>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export"
        subtitle="Revenue per tax group"
        reportPath="/api/analytics/revenue-by-tax-group/export"
        params={{
          connectionId: activeConnectionId || undefined,
          search: search || undefined,
          ...queryParams,
        }}
      />

      <RowDetailsDialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        title={selectedItem?.taxGroup || "Tax group details"}
        description="Selected tax group details"
        details={
          selectedItem
            ? [
                { label: "Tax Group", value: selectedItem.taxGroup },
                { label: "Tax base", value: formatCurrency(selectedItem.total) },
                { label: "Tax Amount", value: formatCurrency(selectedItem.taxAmount) },
              ]
            : []
        }
      />
    </div>
  );
}
