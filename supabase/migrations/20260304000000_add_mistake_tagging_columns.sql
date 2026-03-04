-- Add mistake tagging columns to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mistake_tagging text DEFAULT '';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mistake_tags text[] DEFAULT ARRAY[]::text[];

-- Create index for mistake_tags for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_mistake_tags ON public.trades USING GIN(mistake_tags);
