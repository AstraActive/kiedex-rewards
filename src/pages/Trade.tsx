import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireMFA } from '@/components/auth/RequireMFA';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceChart } from '@/components/market/PriceChart';
import { SymbolSelector } from '@/components/market/SymbolSelector';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { PositionsTable } from '@/components/trading/PositionsTable';
import { TradesTable } from '@/components/trading/TradesTable';
import { TradesCardList } from '@/components/trading/TradesCardList';
import { TradesFilterBar } from '@/components/trading/TradesFilterBar';
import { TradesPagination } from '@/components/trading/TradesPagination';
import { TradeDetailsModal } from '@/components/trading/TradeDetailsModal';
import { useOpenPositions } from '@/hooks/useOpenPositions';
import { usePaginatedTradesHistory, TradesFilters } from '@/hooks/usePaginatedTradesHistory';
import { TradeHistory } from '@/hooks/useTradesHistory';
import { TimeFrame } from '@/hooks/useKlines';
import { useIsMobile } from '@/hooks/use-mobile';

function TradeContent() {
  const [searchParams] = useSearchParams();
  const initialSymbol = searchParams.get('symbol') || 'BTCUSDT';
  const isMobile = useIsMobile();
  
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<TimeFrame>('15m');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<TradesFilters>({});
  
  // Trade details modal
  const [selectedTrade, setSelectedTrade] = useState<TradeHistory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const { positions, isLoading: posLoading, closePosition, isClosing } = useOpenPositions();
  const { data: tradesData, isLoading: tradesLoading } = usePaginatedTradesHistory({
    page,
    pageSize,
    filters,
  });

  const handleTradeClick = (trade: TradeHistory) => {
    setSelectedTrade(trade);
    setModalOpen(true);
  };

  const handleFiltersChange = (newFilters: TradesFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0); // Reset to first page when page size changes
  };

  return (
    <AppLayout>
      <div className="container py-3 md:py-4 pb-20 md:pb-6">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3">
              <SymbolSelector value={symbol} onValueChange={setSymbol} className="w-36 md:w-40" />
            </div>
            <PriceChart 
              symbol={symbol} 
              timeframe={timeframe} 
              onTimeframeChange={setTimeframe}
              height={280}
            />
          </div>

          {/* Order Panel */}
          <div>
            <OrderPanel symbol={symbol} />
          </div>
        </div>

        {/* Positions & History */}
        <div className="mt-3 md:mt-4">
          <Tabs defaultValue="positions">
            <TabsList className="bg-secondary h-8 md:h-9">
              <TabsTrigger value="positions" className="text-xs md:text-sm">Positions ({positions.length})</TabsTrigger>
              <TabsTrigger value="history" className="text-xs md:text-sm">History</TabsTrigger>
            </TabsList>
            <TabsContent value="positions" className="mt-2 md:mt-3">
              <Card className="bg-card border-border">
                <CardContent className="p-2 md:p-4">
                  <PositionsTable 
                    positions={positions} 
                    isLoading={posLoading}
                    onClose={closePosition}
                    isClosing={isClosing}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-2 md:mt-3">
              <Card className="bg-card border-border">
                <CardContent className="p-2 md:p-4">
                  <TradesFilterBar filters={filters} onFiltersChange={handleFiltersChange} />
                  
                  {isMobile ? (
                    <TradesCardList 
                      trades={tradesData?.trades || []} 
                      isLoading={tradesLoading}
                      onTradeClick={handleTradeClick}
                    />
                  ) : (
                    <TradesTable 
                      trades={tradesData?.trades || []} 
                      isLoading={tradesLoading}
                      onTradeClick={handleTradeClick}
                    />
                  )}
                  
                  <TradesPagination
                    page={page}
                    totalPages={tradesData?.totalPages || 0}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    isLoading={tradesLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <TradeDetailsModal
        trade={selectedTrade}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </AppLayout>
  );
}

export default function Trade() {
  return (
    <RequireAuth>
      <RequireMFA>
        <TradeContent />
      </RequireMFA>
    </RequireAuth>
  );
}
