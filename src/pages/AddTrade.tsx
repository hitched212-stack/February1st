import { useSearchParams } from 'react-router-dom';
import { TradeForm } from '@/components/trade/TradeForm';

export default function AddTrade() {
  const [searchParams] = useSearchParams();
  const defaultDate = searchParams.get('date');

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent animate-in fade-in-0 slide-in-from-bottom-6 duration-500 ease-out">
      <div className="relative flex-1 overflow-hidden">
        <TradeForm />
      </div>
    </div>
  );
}
